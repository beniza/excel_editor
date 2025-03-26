# Deployment Guide for React Excel Editor

## Build Status

The application has been successfully built. The production-ready files are located in the `dist` directory.

## Deployment Options

### Option 1: Static Hosting Services

#### Netlify

1. Create an account on [Netlify](https://www.netlify.com/)
2. Install Netlify CLI: `npm install -g netlify-cli`
3. Login to Netlify: `netlify login`
4. Deploy the site:
   ```
   netlify deploy
   ```
5. When prompted, select the `dist` folder as your publish directory
6. Preview the deployment and then deploy to production with:
   ```
   netlify deploy --prod
   ```

#### Vercel

1. Create an account on [Vercel](https://vercel.com/)
2. Install Vercel CLI: `npm install -g vercel`
3. Login to Vercel: `vercel login`
4. Deploy the site:
   ```
   vercel
   ```
5. Follow the prompts and specify the `dist` directory when asked for the output directory

#### GitHub Pages

1. Create a GitHub repository for your project
2. Add a `base` property to your `vite.config.js` file if deploying to a subdirectory:
   ```javascript
   export default defineConfig({
     plugins: [react()],
     base: '/your-repo-name/', // Only needed if not using a custom domain
   })
   ```
3. Rebuild the project after making this change: `npm run build`
4. Push your code to GitHub
5. Enable GitHub Pages in your repository settings
6. Set the source to the `gh-pages` branch and root folder
7. Use a GitHub Action to automate deployment (recommended):
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [main]
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Setup Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '18'
         - name: Install dependencies
           run: npm ci
         - name: Build
           run: npm run build
         - name: Deploy to GitHub Pages
           uses: JamesIves/github-pages-deploy-action@4.1.4
           with:
             branch: gh-pages
             folder: dist
   ```

### Option 2: Traditional Web Servers

#### Apache

1. Copy the contents of the `dist` directory to your Apache document root
2. Create a `.htaccess` file in the root with:
   ```
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

#### Nginx

1. Copy the contents of the `dist` directory to your Nginx document root
2. Configure your Nginx server block:
   ```
   server {
     listen 80;
     server_name your-domain.com;
     root /path/to/dist;
     index index.html;
     
     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

### Option 3: Docker Deployment

Create a `Dockerfile` in your project root:

```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create an `nginx.conf` file:

```
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
  }
}
```

Build and run the Docker container:

```bash
docker build -t react-excel-editor .
docker run -p 8080:80 react-excel-editor
```

## Post-Deployment Considerations

1. **Environment Variables**: If your app uses environment variables, make sure they're properly configured in your deployment environment.

2. **CORS**: If your app makes API calls, ensure CORS is properly configured on your backend.

3. **Performance Monitoring**: Consider adding performance monitoring tools like Google Analytics or Sentry.

4. **SSL/TLS**: Ensure your deployment has HTTPS enabled for security.

5. **Cache Control**: Set appropriate cache headers for static assets.

## Troubleshooting

- If you encounter 404 errors for routes, ensure your server is configured to redirect all requests to index.html for client-side routing.
- If assets aren't loading, check that the base path is correctly configured in your Vite config.
- For large bundle size warnings, consider code splitting and lazy loading components.