const { BasePage } = require('./BasePage');

class DashboardPage extends BasePage {

    constructor(page) {
        super(page);
        this.breadcrumb = this.byRole('navigation', { name: 'breadcrumb' });
        this.sidebar = this.$('[data-slot="sidebar"]');
        this.dashboardNavLink = this.sidebar.getByRole('link', { name: 'Dashboard', exact: true });
        this.organisationNavLink = this.sidebar.getByRole('link', { name: 'Organisation' });
        this.userMenuButton = this.byRole('button').filter({ hasText: '@' });
    }

    async goto() {
        await super.goto('/dashboard');
    }

}
module.exports = { DashboardPage };
