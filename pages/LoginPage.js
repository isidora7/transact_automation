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

}
module.exports = { LoginPage };
