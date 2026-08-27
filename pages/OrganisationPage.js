const { BasePage } = require('./BasePage');

class OrganisationPage extends BasePage {

    constructor(page) {
        super(page);
        this.orgNameHeading = this.byRole('heading', { level: 1 });
        this.rosterLabel = this.byText('Roster');
    }

    async goto() {
        await super.goto('/organisation');
    }

}
module.exports = { OrganisationPage };
