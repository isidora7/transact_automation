const { BasePage } = require('./BasePage');

class CreateLoadPage extends BasePage {

    constructor(page) {
        super(page);
        // Dispatcher-only trigger, lives in TopBar outside the dialog.
        this.openButton = this.byRole('button', { name: 'Create Load', exact: true });

        // Scope everything else to the dialog so it never collides with the
        // TopBar trigger button, which shares the same "Create Load" text as
        // the final submit button on the review step.
        this.dialog = this.$('[data-slot="dialog-content"]');

        // Details step
        this.customerNameInput = this.dialog.getByLabel('Customer name');
        this.customerEmailInput = this.dialog.getByLabel('Customer email');
        this.rateInput = this.dialog.getByLabel('Rate');

        // Assignment step
        this.driverSelect = this.dialog.getByLabel('Driver');
        this.unitNumberInput = this.dialog.getByLabel('Unit number');
        this.trailerNumberInput = this.dialog.getByLabel('Trailer number');

        // Review step
        this.reviewHeading = this.dialog.getByRole('heading', { name: 'Review' });
        this.submitButton = this.dialog.getByRole('button', { name: 'Create Load' });

        // Nav
        this.nextButton = this.dialog.getByRole('button', { name: 'Next' });
        this.backButton = this.dialog.getByRole('button', { name: 'Back' });
        this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
        this.errorMessage = this.dialog.locator('.text-destructive');
    }

    async open() {
        await this.openButton.click();
    }

    async fillDetails({ customerName, customerEmail, rate }) {
        await this.customerNameInput.fill(customerName);
        await this.customerEmailInput.fill(customerEmail);
        await this.rateInput.fill(String(rate));
    }

    // Selects a driver by (partial) name match on the native <select>'s option
    // text, which is rendered as "<name> · <email>" — matching by value (a
    // uuid we don't know ahead of time) isn't practical from the UI.
    async selectDriverByName(driverName) {
        const value = await this.driverSelect
            .locator('option')
            .filter({ hasText: driverName })
            .getAttribute('value');
        await this.driverSelect.selectOption(value);
    }

    async fillAssignment({ unitNumber, trailerNumber } = {}) {
        if (unitNumber !== undefined) {
            await this.unitNumberInput.fill(unitNumber);
        }
        if (trailerNumber !== undefined) {
            await this.trailerNumberInput.fill(trailerNumber);
        }
    }

    stopField(index, field) {
        return this.dialog.locator(`#create-load-stop-${field}-${index}`);
    }

    // Only fills whichever keys are provided, so validation tests can leave
    // specific fields blank instead of always supplying a complete stop.
    async fillStop(index, { facilityName, address, city, state, zip, date, time } = {}) {
        if (facilityName !== undefined) await this.stopField(index, 'facility').fill(facilityName);
        if (address !== undefined) await this.stopField(index, 'address').fill(address);
        if (city !== undefined) await this.stopField(index, 'city').fill(city);
        if (state !== undefined) await this.stopField(index, 'state').fill(state);
        if (zip !== undefined) await this.stopField(index, 'zip').fill(zip);
        if (date !== undefined) await this.stopField(index, 'date').fill(date);
        if (time !== undefined) await this.stopField(index, 'time').fill(time);
    }

    // The Pickup/Drop toggle buttons render with lowercase accessible names
    // ("pickup"/"drop") and repeat per stop, in stop order — .nth(index)
    // reliably picks the button for a given stop.
    stopTypeButton(index, type) {
        return this.dialog.getByRole('button', { name: type, exact: true }).nth(index);
    }

    async goNext() {
        await this.nextButton.click();
    }

    async submit() {
        await this.submitButton.click();
    }
}
module.exports = { CreateLoadPage };
