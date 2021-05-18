FROM golang:1.16

WORKDIR /app
RUN git clone https://github.com/smartcontractkit/external-initiator.git /app/external-initiator
RUN cd /app/external-initiator && go build main.go
COPY runner.go /app/runner.go

ENTRYPOINT ["go", "run", "/app/runner.go"]