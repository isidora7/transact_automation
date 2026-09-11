const { BasePage } = require('./BasePage');

class DriverPortalPage extends BasePage {

    constructor(page) {
        super(page);
        // The load's customer name renders as the first <h2> on the page;
        // DriverPortal itself has two more <h2>s further down ("Upload
        // shipment documents", "Add a cost right where it happened").
        this.customerHeading = this.byRole('heading', { level: 2 }).first();
        this.stops = this.$('article');
    }

    async gotoToken(token) {
        await this.page.goto(`/d/${token}`);
    }

    stop(index) {
        return this.stops.nth(index);
    }

    // Only the current/active stop renders a real <button> for check-in/out;
    // other stops render a plain, non-interactive <span> with the same kind
    // of label ("Locked", "Checked out") — scoping to role=button avoids
    // ever targeting one of those.
    stopActionButton(index) {
        return this.stop(index).getByRole('button', { name: /^(Check in|Check out)$/ });
    }

    checkedInBadge(index) {
        return this.stop(index).getByText('Checked in', { exact: true });
    }

    // Once a stop is checked out AND no longer current, its action area also
    // renders a plain "Checked out" span (stopActionLabel) alongside the
    // actual status badge — .first() picks the badge, which comes first in
    // document order.
    checkedOutBadge(index) {
        return this.stop(index).getByText('Checked out', { exact: true }).first();
    }

    addCostButton(index) {
        return this.stop(index).getByRole('button', { name: /Add cost for/ });
    }
}
module.exports = { DriverPortalPage };
