# Development Context: Portfolio v9

This document provides a comprehensive overview of the portfolio website's architecture, technologies, and key features.

## Tech Stack

- **Frontend Framework**: React with Remix
- **Deployment**: Netlify
- **CMS**: Sanity
- **Styling**: Tailwind CSS with custom CSS modules
- **Animation**: GSAP (GreenSock Animation Platform)
- **3D Rendering**: Three.js
- **Form Handling**: Typeform

## Project Structure

The project follows a standard Remix application structure with the following key directories:

- `/app`: Main application code
  - `/components`: Reusable UI components
  - `/contexts`: React context providers
  - `/lib`: Utility functions and services
  - `/routes`: Page components and API routes
  - `/styles`: Global and component-specific styles
  - `/types`: TypeScript type definitions
- `/portfolio-v9`: Sanity CMS configuration and schemas
- `/public`: Static assets (images, fonts, 3D models, sounds)
- `/scripts`: Utility scripts

## Key Features

### 1. Interactive Elements

#### Bullet Hole Effect
The site features a unique interactive element where clicking on the page creates bullet hole effects with smoke animations:

- `BulletHoleContext.tsx`: Manages the state of bullet holes across the application
- `BulletHole.tsx`: Renders individual bullet holes with positioning
- `SmokeEffect.tsx`: Creates a Three.js-powered smoke animation for each bullet hole

#### 3D Horseshoe Model
The homepage features an interactive 3D horseshoe model:

- `HorseshoeModel.tsx`: Loads and renders a 3D horseshoe model using Three.js
- Includes features like rotation on scroll, user interaction, and responsive sizing

#### Pixelization Effect
Images throughout the site use a pixelization effect that smoothly transitions to the full image:

- `PixelizeImage.tsx`: Creates a canvas-based pixelization effect with GSAP animations
- Supports scroll-triggered depixelization and manual triggering

### 2. Content Management

The site uses Sanity as its headless CMS with the following content types:

- **Projects**: Portfolio work showcasing client projects
- **Services**: Company service offerings
- **Team Members**: Team information
- **Partners**: Partner organizations
- **Client Logos**: Client brand logos
- **Hero Media**: Hero section content
- **Image With Text**: Content blocks combining images and text
- **Secret About**: Hidden about section content

The Sanity integration is handled through:
- `sanity.server.ts`: Client configuration
- `api.sanity.tsx`: API endpoint for fetching data
- Schema definitions in `/portfolio-v9/schemas/`

### 3. Routing and Pages

The site uses Remix's file-based routing system:

- `_index.tsx`: Homepage
- `about.tsx`: About page
- `contact.tsx`: Contact page with Typeform integration
- `work.tsx`: Projects listing page with filtering
- `work.$slug.tsx`: Dynamic project detail pages
- Individual project pages in `/work/` directory

### 4. Styling Approach

The styling combines Tailwind CSS with custom CSS:

- Global styles in `global.css`
- Component-specific styles using CSS modules (e.g., `contact.module.css`)
- Custom fonts loaded from `/public/fonts/`
- Responsive design with mobile-first approach

### 5. Secret Section

The site includes a hidden "secret" section:

- `SecretSection.tsx`: Container for secret content
- `SecretAbout.tsx`: Hidden about content
- `SecretTeam.tsx`: Hidden team information

## Development Notes

### Animation Strategy

- GSAP is used for complex animations and transitions
- ScrollTrigger plugin for scroll-based animations
- TextPlugin for text manipulation effects
- CSS transitions for simpler effects

#### Text Scramble Effect

The navigation links feature a text scramble effect on hover:

```javascript
// Create a scrambled version of text using only the original letters
const letters = "WORK".split("");
const scramble = () => {
  // Shuffle the letters
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
};

// Create a timeline for the scramble effect
const tl = gsap.timeline();

// Add multiple scrambles to create the effect
tl.to(elementRef.current, { duration: 0.05, text: scramble() })
  .to(elementRef.current, { duration: 0.05, text: scramble() })
  .to(elementRef.current, { duration: 0.05, text: scramble() })
  .to(elementRef.current, { duration: 0.05, text: "WORK" });
```

This technique:
- Uses GSAP's TextPlugin to animate text content
- Only scrambles the original letters (preserving character set)
- Creates multiple rapid iterations for a dynamic effect
- Can be applied to any text element with a React ref
- Requires importing and registering the TextPlugin:

```javascript
import { TextPlugin } from 'gsap/TextPlugin';
gsap.registerPlugin(TextPlugin);
```

### Performance Considerations

- Images use the `PixelizeImage` component for progressive loading
- 3D elements are optimized for performance (e.g., limiting polygon count)
- Lazy loading of components and resources

### Accessibility

- Semantic HTML structure
- ARIA attributes for interactive elements
- Keyboard navigation support

### State Management

- React context for global state (e.g., BulletHoleContext)
- Component-level state for UI interactions
- Remix's loader/action pattern for data fetching

## Build and Deployment

The application is built using Remix's build system and deployed to Netlify:

- Build command: `node scripts/generateProjectPages.js && SANITY_PROJECT_ID=hv36fjce SANITY_DATASET=production remix vite:build`
- Development server: `remix vite:dev`
- Netlify adapter for deployment

### Critical Configuration Note

The current Netlify/Sanity/Remix integration has been carefully configured and should be maintained as is. The setup took significant effort to get working correctly, and any changes to the build process, deployment configuration, or integration between these systems should be approached with extreme caution.

Key aspects to preserve:
- The build command sequence with environment variables
- The Sanity client configuration in `sanity.server.ts`
- The API endpoint structure in `api.sanity.tsx`
- The project generation script in `scripts/generateProjectPages.js`
- The Netlify adapter configuration

### Project Generation Script

The `scripts/generateProjectPages.js` script is a critical part of the build process. It:

1. Connects to the Sanity API to fetch all projects
2. Generates individual route files for each project in `app/routes/work/`
3. Creates a file for each project slug that imports and reuses the dynamic `$slug.tsx` route

This approach allows for:
- Static routes for each project (better SEO)
- Reuse of the dynamic route component logic
- Simplified URL structure for projects

The script runs as part of the build command and must be maintained to ensure all project pages are properly generated during deployment.

### Netlify Configuration

The site is deployed on Netlify with specific configuration in `netlify.toml`:

```toml
[build]
command = "npm run build"
publish = "build/client"

[dev]
command = "npm run dev"
framework = "vite"

[functions]
node_bundler = "esbuild"

[[headers]]
for = "/build/*"

[headers.values]
"Cache-Control" = "public, max-age=31560000, immutable"
```

Key aspects of the Netlify configuration:
- The build output is published from the `build/client` directory
- Vite is used as the development framework
- ESBuild is used for bundling Netlify functions
- Static assets in the `/build` directory are cached with a long expiration time for performance

## Environment Variables

- `SANITY_PROJECT_ID`: Sanity project identifier (hv36fjce)
- `SANITY_DATASET`: Sanity dataset name (production)
