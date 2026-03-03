# Required VS Code Extensions & Project Libraries

## Project Tech Stack

### Backend Dependencies
- **express:** ^4.18.2 - Web framework for Node.js
- **sequelize:** ^6.37.7 - Promise-based ORM
- **sqlite3:** ^5.1.7 - SQLite database driver (local development)
- **bcryptjs:** ^2.4.3 - Password hashing library
- **jsonwebtoken:** ^9.0.2 - JWT authentication
- **cookie-parser:** ^1.4.6 - Parse HTTP cookies
- **cors:** ^2.8.5 - Enable CORS middleware
- **dotenv:** ^16.3.1 - Environment variable management
- **google-auth-library:** ^10.5.0 - Google OAuth 2.0 authentication
- **nodemailer:** ^7.0.12 - Email sending functionality
- **multer:** ^2.1.0 - File upload handling (proof documents, CSV imports)
- **csv-parser:** ^3.2.0 - CSV file parsing for bulk imports
- **nodemon:** ^3.1.11 (dev) - Auto-restart server on changes

### Frontend Dependencies
- **react:** ^18.2.0 - UI library
- **react-dom:** ^18.2.0 - React DOM rendering
- **react-router-dom:** ^6.20.1 - Client-side routing
- **react-scripts:** ^5.0.1 - React development scripts
- **axios:** ^1.6.2 - HTTP client for API calls
- **bootstrap:** ^5.3.8 - CSS framework
- **react-bootstrap:** ^2.10.10 - Bootstrap components for React
- **@react-oauth/google:** ^0.13.4 - Google OAuth integration
- **jwt-decode:** ^4.0.0 - Decode JWT tokens

### Database
- **SQLite** via **Sequelize** (local file: `backend/database.sqlite`)

---

## Essential VS Code Extensions (Must Install)

### 1. **ESLint**
- **ID:** `dbaeumer.vscode-eslint`
- **Purpose:** JavaScript/React linting and code quality
- **Install:** `ext install dbaeumer.vscode-eslint`

### 2. **Prettier - Code formatter**
- **ID:** `esbenp.prettier-vscode`
- **Purpose:** Automatic code formatting for consistent style
- **Install:** `ext install esbenp.prettier-vscode`

### 3. **ES7+ React/Redux/React-Native snippets**
- **ID:** `dsznajder.es7-react-js-snippets`
- **Purpose:** React code snippets and shortcuts
- **Install:** `ext install dsznajder.es7-react-js-snippets`

### 4. **SQLite Viewer** (or similar)
- **ID:** `alexcvzz.vscode-sqlite`
- **Purpose:** Browse the local SQLite database file
- **Install:** `ext install alexcvzz.vscode-sqlite`
- **Note:** Open `backend/database.sqlite` to inspect tables

### 5. **Thunder Client** (or REST Client)
- **ID:** `rangav.vscode-thunder-client`
- **Purpose:** API testing and debugging (test auth endpoints, Google OAuth, etc.)
- **Install:** `ext install rangav.vscode-thunder-client`
- **Alternative:** REST Client (`humao.rest-client`)

### 6. **npm Intellisense**
- **ID:** `christian-kohler.npm-intellisense`
- **Purpose:** Autocomplete npm modules in import statements
- **Install:** `ext install christian-kohler.npm-intellisense`

---

## Highly Recommended Extensions

### 7. **Path Intellisense**
- **ID:** `christian-kohler.path-intellisense`
- **Purpose:** Autocomplete file paths
- **Install:** `ext install christian-kohler.path-intellisense`

### 8. **GitLens**
- **ID:** `eamodio.gitlens`
- **Purpose:** Enhanced Git capabilities and history
- **Install:** `ext install eamodio.gitlens`

### 9. **Auto Rename Tag**
- **ID:** `formulahendry.auto-rename-tag`
- **Purpose:** Automatically rename paired HTML/JSX tags
- **Install:** `ext install formulahendry.auto-rename-tag`

### 10. **JavaScript (ES6) code snippets**
- **ID:** `xabikos.JavaScriptSnippets`
- **Purpose:** ES6 syntax snippets
- **Install:** `ext install xabikos.JavaScriptSnippets`

### 11. **Dotenv Official**
- **ID:** `dotenv.dotenv-vscode`
- **Purpose:** Syntax highlighting for .env files (JWT secrets, database URLs, Google OAuth credentials)
- **Install:** `ext install dotenv.dotenv-vscode`

---

## Optional (Nice to Have)

### 12. **Console Ninja**
- **ID:** `WallabyJs.console-ninja`
- **Purpose:** Display console.log output directly in your editor
- **Install:** `ext install WallabyJs.console-ninja`

### 13. **Material Icon Theme**
- **ID:** `PKief.material-icon-theme`
- **Purpose:** Better file icons for easier navigation
- **Install:** `ext install PKief.material-icon-theme`

### 14. **Live Share**
- **ID:** `MS-vsliveshare.vsliveshare`
- **Purpose:** Real-time collaborative editing
- **Install:** `ext install MS-vsliveshare.vsliveshare`

### 15. **Better Comments**
- **ID:** `aaron-bond.better-comments`
- **Purpose:** Improved comment highlighting
- **Install:** `ext install aaron-bond.better-comments`

### 16. **Error Lens**
- **ID:** `usernamehw.errorlens`
- **Purpose:** Highlight errors and warnings inline
- **Install:** `ext install usernamehw.errorlens`

---

## Quick Install All Essential Extensions

Run this command in VS Code terminal or Command Palette (`Ctrl+Shift+P` → "Shell Command: Install code"):

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension alexcvzz.vscode-sqlite
code --install-extension rangav.vscode-thunder-client
code --install-extension christian-kohler.npm-intellisense
code --install-extension christian-kohler.path-intellisense
code --install-extension eamodio.gitlens
code --install-extension formulahendry.auto-rename-tag
code --install-extension xabikos.JavaScriptSnippets
code --install-extension dotenv.dotenv-vscode
```

---

## VS Code Settings Configuration

Add these settings to your `.vscode/settings.json` for consistent team configuration:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "javascript.updateImportsOnFileMove.enabled": "always",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Node.js and npm Requirements

Make sure team members have installed:
- **Node.js:** v14 or higher
- **npm:** v8 or higher
- **Database:** SQLite (no external DB setup needed — the file is auto-created on first run)

Check versions:
```bash
node --version
npm --version
```

---

## Getting Started for New Team Members

1. Install VS Code: https://code.visualstudio.com/
2. Install Node.js: https://nodejs.org/
3. Clone the repository
4. Install all essential extensions listed above
5. Run `npm install` in both `frontend/` and `backend/` folders
6. Configure `.env` file in `backend/`:
   - Set JWT secret, email credentials, Google OAuth Client ID
7. Seed the database (optional): `cd backend && node seed.js`
8. Database is a local SQLite file (`backend/database.sqlite`) — no external setup needed
9. Review [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for OAuth configuration
10. Start development: `npm run dev` (backend) and `npm start` (frontend)

---

## Additional Resources

- [VS Code React Development](https://code.visualstudio.com/docs/nodejs/reactjs-tutorial)
- [VS Code Node.js Development](https://code.visualstudio.com/docs/nodejs/nodejs-tutorial)
- [ESLint Configuration](https://eslint.org/docs/latest/use/getting-started)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [Sequelize Documentation](https://sequelize.org/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [React Bootstrap Documentation](https://react-bootstrap.github.io/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [React Router v6 Documentation](https://reactrouter.com/en/main)
- [JWT.io](https://jwt.io/) - JWT debugger and documentation
