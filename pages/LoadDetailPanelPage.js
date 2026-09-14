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

    // Unlike the proof-reject flow, clicking Reject here does NOT close the
    // preview dialog first — it stacks a second Dialog on top, so both
    // preview and reject-note dialogs are open (and both render
    // [data-slot="dialog-content"]) at once. .last() picks the one that
    // mounted second (the reject-note dialog, on top).
    get docRejectNoteInput() {
        return this.$('[data-slot="dialog-content"]').last().getByLabel('Rejection note');
    }

    get confirmRejectDocButton() {
        return this.$('[data-slot="dialog-content"]').last().getByRole('button', { name: 'Reject document', exact: true });
    }

    async rejectDoc(type, note) {
        await this.openDocPreview(type);
        await this.docPreviewRejectButton.click();
        await this.docRejectNoteInput.fill(note);
        await this.confirmRejectDocButton.click();
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

    // Cost-level proof photos. The thumbnail's aria-label is unique per
    // proof/cost combo ("Open proof <n> for <costLabel>"), so no extra
    // scoping is needed to find it. Its preview dialog reuses the same
    // [data-slot="dialog-content"] selector as every other dialog in this
    // panel (only one is ever open at a time) — the "Approve proof" label
    // here doesn't collide with the cost-level "Approve" button, so unlike
    // approveButton/declineButton it needs no extra disambiguation.
    proofThumbnail(costLabel, index = 1) {
        return this.panel.getByRole('button', { name: `Open proof ${index} for ${costLabel}` });
    }

    get proofPreviewDialog() {
        return this.$('[data-slot="dialog-content"]');
    }

    get proofPreviewApproveButton() {
        return this.proofPreviewDialog.getByRole('button', { name: 'Approve proof', exact: true });
    }

    get proofPreviewRejectButton() {
        return this.proofPreviewDialog.getByRole('button', { name: 'Reject', exact: true });
    }

    async openProofPreview(costLabel, index = 1) {
        await this.proofThumbnail(costLabel, index).click();
    }

    async approveProof(costLabel) {
        await this.openProofPreview(costLabel);
        await this.proofPreviewApproveButton.click();
    }

    // Clicking Reject in the preview closes it and opens a separate
    // "Reject proof" dialog requiring a note before it'll submit — same
    // [data-slot="dialog-content"] reuse pattern (preview is already closed
    // by the time this one opens).
    get rejectProofNoteInput() {
        return this.$('[data-slot="dialog-content"]').getByLabel('Rejection note');
    }

    get confirmRejectProofButton() {
        return this.$('[data-slot="dialog-content"]').getByRole('button', { name: 'Reject proof', exact: true });
    }

    async rejectProof(costLabel, note) {
        await this.openProofPreview(costLabel);
        await this.proofPreviewRejectButton.click();
        await this.rejectProofNoteInput.fill(note);
        await this.confirmRejectProofButton.click();
    }

    // Footer lifecycle actions. Both dialogs are portaled outside the aside
    // (like every other dialog in this panel), so their own confirm buttons
    // never collide with these footer buttons even without extra scoping —
    // scoped to the dialog anyway for consistency with the rest of the page.
    get cancelLoadButton() {
        return this.panel.getByRole('button', { name: 'Cancel', exact: true });
    }

    get completeLoadButton() {
        return this.panel.getByRole('button', { name: 'Complete', exact: true });
    }

    get cancelDialog() {
        return this.$('[data-slot="alert-dialog-content"]');
    }

    get confirmCancelButton() {
        return this.cancelDialog.getByRole('button', { name: 'Cancel Load', exact: true });
    }

    get completeDialog() {
        return this.$('[data-slot="alert-dialog-content"]');
    }

    get confirmCompleteButton() {
        return this.completeDialog.getByRole('button', { name: 'Complete', exact: true });
    }

    async cancelLoad() {
        await this.cancelLoadButton.click();
        await this.confirmCancelButton.click();
    }

    async completeLoad() {
        await this.completeLoadButton.click();
        await this.confirmCompleteButton.click();
    }
}
module.exports = { LoadDetailPanelPage };
