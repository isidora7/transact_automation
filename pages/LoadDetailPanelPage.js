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

    // The BOL/POD status pill in the header (aria-label "BOL — Pending
    // review" etc.) doubles as the button that opens the preview dialog —
    // match only the "<TYPE> —" prefix so it works regardless of status text.
    docBadge(type) {
        return this.panel.getByRole('button', { name: new RegExp(`^${type.toUpperCase()} —`) });
    }

    async openDocPreview(type) {
        await this.docBadge(type).click();
    }

    // Same underlying [data-slot="dialog-content"] selector as approveDialog —
    // only one dialog is ever open at a time, so this just names the same
    // element for whichever moment in the flow it's used at.
    get docPreviewDialog() {
        return this.$('[data-slot="dialog-content"]');
    }

    get docPreviewApproveButton() {
        return this.docPreviewDialog.getByRole('button', { name: 'Approve', exact: true });
    }

    get docPreviewRejectButton() {
        return this.docPreviewDialog.getByRole('button', { name: 'Reject', exact: true });
    }

    async approveDoc(type) {
        await this.openDocPreview(type);
        await this.docPreviewApproveButton.click();
    }

    // Decline confirmation is a base-ui AlertDialog, not the plain Dialog
    // primitive the other confirmations use — it renders a distinct
    // data-slot ("alert-dialog-content"), which is what lets its own
    // "Decline" button be scoped separately from the row-level one.
    get declineDialog() {
        return this.$('[data-slot="alert-dialog-content"]');
    }

    get confirmDeclineButton() {
        return this.declineDialog.getByRole('button', { name: 'Decline', exact: true });
    }

    async declineCost() {
        await this.declineButton.click();
        await this.confirmDeclineButton.click();
    }
}
module.exports = { LoadDetailPanelPage };
