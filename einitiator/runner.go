package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"time"
)

var (
	port = ":8081"

	mu sync.Mutex
	me map[string](chan bool)
)

type Params struct {
	Name              string `json:"name"`
	URL               string `json:"url"`
	IncomingAccessKey string `json:"incomingAccessKey"`
	IncomingSecret    string `json:"incomingSecret"`
	OutgoingToken     string `json:"outgoingToken"`
	OutgoingSecret    string `json:"outgoingSecret"`
	Ethereum          string `json:"ethereum"`
}

func init() {
	log.SetOutput(os.Stdout)
	me = make(map[string](chan bool))
	if data, ok := os.LookupEnv("EINITIATOR_PORT"); ok {
		port = data
	}
}

func logger(h http.HandlerFunc) http.HandlerFunc {
	return func(rw http.ResponseWriter, r *http.Request) {
		start := time.Now()
		uri := r.RequestURI
		method := r.Method

		h.ServeHTTP(rw, r)

		duration := time.Since(start)
		log.Printf("[%s] %s %s", duration, method, uri)
	}
}

func run(params *Params) {
	mu.Lock()
	defer mu.Unlock()
	me[params.Name] = make(chan bool, 1)
	prms := params

	go func(stop chan bool) {
		app := exec.Command("/app/external-initiator/main", fmt.Sprintf("{\"name\":\"ethereum\",\"type\":\"ethereum\",\"url\":\"%s\"}", prms.Ethereum))
		app.Env = os.Environ()
		app.Env = append(app.Env, fmt.Sprintf("EI_CI_ACCESSKEY=%s", prms.OutgoingToken))
		app.Env = append(app.Env, fmt.Sprintf("EI_CI_SECRET=%s", prms.OutgoingSecret))
		app.Env = append(app.Env, fmt.Sprintf("EI_IC_ACCESSKEY=%s", prms.IncomingAccessKey))
		app.Env = append(app.Env, fmt.Sprintf("EI_IC_SECRET=%s", prms.IncomingSecret))
		app.Stdout = os.Stdout
		app.Stderr = os.Stderr

		log.Printf("[%s] ENV: ", prms.Name)
		for i := range app.Env {
			log.Printf("  [%s] %s", prms.Name, app.Env[i])
		}

		if err := app.Start(); err != nil {
			log.Panicf("[%s]: %s", prms.Name, err)
		}
		defer app.Process.Kill()

		for {
			select {
			case <-stop:
				return
			}
		}
	}(me[prms.Name])
}

func main() {
	http.HandleFunc("/", logger(func(rw http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.NotFound(rw, r)
			return
		}

		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			http.Error(rw, "can't read body", http.StatusBadRequest)
			return
		}
		var prms Params
		if err := json.Unmarshal(body, &prms); err != nil {
			http.Error(rw, "can't decode body", http.StatusBadRequest)
			return
		}

		run(&prms)
		rw.WriteHeader(http.StatusOK)
		rw.Write([]byte("ok"))
	}))
	log.Printf("start app on port: %s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Panicf("  error: %s", err)
	}
}
