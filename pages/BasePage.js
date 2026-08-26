class BasePage {

    constructor(page) {
        this.page = page;
    }

    async goto(path = '/') {
        await this.page.goto(path);
    }

    byRole(role, options) {
        return this.page.getByRole(role, options);
    }

    byLabel(text, options) {
        return this.page.getByLabel(text, options);
    }

    byText(text, options) {
        return this.page.getByText(text, options);
    }

    byTestId(testId) {
        return this.page.getByTestId(testId);
    }

    byPlaceholder(text, options) {
        return this.page.getByPlaceholder(text, options);
    }

    $(selector) {
        return this.page.locator(selector);
    }

    async click(locator) {
        await locator.click();
    }

    async fill(locator, value) {
        await locator.fill(value);
    }

    async getText(locator) {
        return locator.textContent();
    }

}
module.exports = { BasePage };
