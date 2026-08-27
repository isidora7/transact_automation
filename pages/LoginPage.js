const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {

    constructor(page) {
        super(page);
        this.emailInput = this.byLabel('Email');
        this.passwordInput = this.byLabel('Password');
        this.loginButton = this.byRole('button', { name: 'Sign in' });
        this.errorMessage = this.$('.login-error');
    }

    async goto() {
        await super.goto('/login');
    }

    async login(email, password) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
    }

}
module.exports = { LoginPage };
