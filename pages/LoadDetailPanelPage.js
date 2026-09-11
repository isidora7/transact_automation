const { BasePage } = require('./BasePage');

class LoadDetailPanelPage extends BasePage {

    constructor(page) {
        super(page);
        this.panel = this.$('.detail-panel');
        this.closeButton = this.panel.getByRole('button', { name: 'Close' });

        // Approve/Decline live directly on the cost row in the panel; the
        // confirmation dialog is a separate Radix Dialog, so its own
        // "Approve" button needs to be scoped there to avoid colliding with
        // this one (same "Approve" text, different element).
        this.approveButton = this.panel.getByRole('button', { name: 'Approve', exact: true });
        this.declineButton = this.panel.getByRole('button', { name: 'Decline', exact: true });

        this.approveDialog = this.$('[data-slot="dialog-content"]');
        this.approveRateInput = this.approveDialog.getByLabel('Rate ($)');
        this.confirmApproveButton = this.approveDialog.getByRole('button', { name: 'Approve', exact: true });
    }

    async approveCost(rate) {
        await this.approveButton.click();
        await this.approveRateInput.fill(String(rate));
        await this.confirmApproveButton.click();
    }
}
module.exports = { LoadDetailPanelPage };
