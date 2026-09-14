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

    // AddCostWizard renders as a Radix Dialog on desktop viewports (a bottom
    // sheet on mobile, per ResponsiveModal) — same data-slot scoping trick as
    // CreateLoadPage, needed because "Next"/"Submit" are aria-labelled with
    // full sentences rather than their visible short text.
    get addCostDialog() {
        return this.$('[data-slot="dialog-content"]');
    }

    costTypeButton(label) {
        return this.addCostDialog.getByRole('button', { name: `Choose ${label}` });
    }

    get addCostNoteInput() {
        return this.addCostDialog.getByLabel('Note');
    }

    get addCostContinueButton() {
        return this.addCostDialog.getByRole('button', { name: 'Continue to the note and proof step' });
    }

    addCostSubmitButton(facilityName) {
        return this.addCostDialog.getByRole('button', { name: `Submit cost for ${facilityName}` });
    }

    // ProofNoteStep's file input has no stable id (React useId()), so it's
    // targeted by type within the dialog instead — only one file input is
    // ever present on this step.
    get addCostProofInput() {
        return this.addCostDialog.locator('input[type="file"]');
    }

    async addProofFiles(files) {
        await this.addCostProofInput.setInputFiles(files);
    }

    // Hidden (sr-only) file input — Playwright's setInputFiles works on it
    // directly without needing to click the visible trigger button first.
    docUploadInput(type) {
        return this.$(`#doc-upload-${type}`);
    }

    async uploadDoc(type, file) {
        await this.docUploadInput(type).setInputFiles(file);
    }

    get docToast() {
        return this.page.getByText(/uploaded successfully$/);
    }

    // Shown on a rejected doc card ("Dispatch note: <note>") — page-level
    // since BOL/POD cards aren't scoped under a stop <article>.
    get docRejectionNote() {
        return this.page.getByText(/^Dispatch note:/);
    }

    // Dispatcher "needs action" / rejection banners at the top of the
    // portal ("Dispatch needs proof for Lumper", "Dispatch requested BOL
    // upload", etc.). The button's accessible name concatenates its title
    // and message paragraphs, so a leading-anchor regex on the title text
    // is enough to match regardless of the (dynamic) message beneath it.
    feedbackItem(titleText) {
        return this.page.getByRole('button', { name: new RegExp(`^${titleText}`) });
    }

    // Clicking a cost-proof-request feedback item expands that cost's
    // inline editor directly (DriverPortal's focusCost sets expandedCostId)
    // — no separate row click needed. Only one editor is ever expanded at
    // a time in these tests, so scoping to the single `[id^="cost-editor-"]`
    // region is enough without tracking the cost's id.
    get costEditorPanel() {
        return this.$('[id^="cost-editor-"]');
    }

    get editProofInput() {
        return this.costEditorPanel.locator('input[type="file"]');
    }

    get saveCostChangesButton() {
        return this.costEditorPanel.getByRole('button', { name: /^Save changes$/ });
    }

    async addProofToExpandedCost(files) {
        await this.editProofInput.setInputFiles(files);
        await this.saveCostChangesButton.click();
    }
}
module.exports = { DriverPortalPage };
