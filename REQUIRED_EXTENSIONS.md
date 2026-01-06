# Required VS Code Extensions for Team Members

## Essential Extensions (Must Install)

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

### 4. **PostgreSQL**
- **ID:** `ckolkman.vscode-postgres`
- **Purpose:** PostgreSQL database management and queries
- **Install:** `ext install ckolkman.vscode-postgres`
- **Note:** Project uses PostgreSQL with Supabase

### 5. **Thunder Client** (or REST Client)
- **ID:** `rangav.vscode-thunder-client`
- **Purpose:** API testing and debugging
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
- **Purpose:** Syntax highlighting for .env files
- **Install:** `ext install dotenv.dotenv-vscode`

---

## Optional (Nice to Have)

### 12. **Material Icon Theme**
- **ID:** `PKief.material-icon-theme`
- **Purpose:** Better file icons for easier navigation
- **Install:** `ext install PKief.material-icon-theme`

### 13. **Bracket Pair Colorizer 2**
- **ID:** `CoenraadS.bracket-pair-colorizer-2`
- **Purpose:** Color matching brackets (Note: VS Code has built-in bracket pair colorization now)
- **Install:** `ext install CoenraadS.bracket-pair-colorizer-2`

### 14. **Live Share**
- **ID:** `MS-vsliveshare.vsliveshare`
- **Purpose:** Real-time collaborative editing
- **Install:** `ext install MS-vsliveshare.vsliveshare`

### 15. **Better Comments**
- **ID:** `aaron-bond.better-comments`
- **Purpose:** Improved comment highlighting
- **Install:** `ext install aaron-bond.better-comments`

---

## Quick Install All Essential Extensions

Run this command in VS Code terminal or Command Palette (`Ctrl+Shift+P` → "Shell Command: Install code"):

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension ckolkman.vscode-postgres
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
- **Node.js:** v16 or higher
- **npm:** v8 or higher
- **PostgreSQL:** Using Supabase (cloud-hosted) - connection details in `.env`

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
5. Run `npm install` in both `frontend` and `backend` folders
6. Configure `.env` files:
   - Backend: Set JWT secret, email credentials, Google OAuth Client ID
   - Frontend: Set Google Client ID (if needed)
7. Database is hosted on Supabase (PostgreSQL) - connection string in `.env`
8. Review [GOOGLE_OAUTH_SETUP.md](../GOOGLE_OAUTH_SETUP.md) for OAuth configuration
9. Start development!

---

## Additional Resources

- [VS Code React Development](https://code.visualstudio.com/docs/nodejs/reactjs-tutorial)
- [VS Code Node.js Development](https://code.visualstudio.com/docs/nodejs/nodejs-tutorial)
- [ESLint Configuration](https://eslint.org/docs/latest/use/getting-started)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
