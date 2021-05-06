context('End to end', function () {
  it('Creates a job that runs', () => {
    cy.login()

    // Create Job
    cy.clickLink('New Job')
    cy.contains('span', 'New Job').should('exist')
    cy.getJobJson().then((jobJson) => {
      cy.get('textarea[id=jobSpec]').paste(jobJson)
    })
    cy.clickButton('Create Job')
    cy.contains('p', 'Successfully created job').should('exist')

    // Run Job
    cy.get('#created-job').click()
    cy.contains('job spec detail')
    cy.clickButton('Run')
    cy.contains('p', 'Successfully created job run')
      .children('a')
      .click()
      .invoke('text')
      .as('runId')
    cy.contains('a > p', 'JSON').click()

    // Wait for job run to complete
    cy.reloadUntilFound('h5:contains(Completed)', { waitTime: 1000 })
    cy.contains('h5', 'Completed').should('exist')

    // Navigate to transactions page
    cy.contains('li > a', 'Transactions').click()
    cy.contains('h4', 'Transactions').should('exist')

    // TODO: Add logic for run
    cy.contains('h5', 'RUN').should('exist')
  })
})
