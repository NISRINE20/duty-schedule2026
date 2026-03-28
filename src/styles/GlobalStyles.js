import { createGlobalStyle } from "styled-components";

const GlobalStyles = createGlobalStyle`
  html {
    /* Liquid scaling: shifts 1rem dynamically based on viewport width */
    font-size: clamp(14px, 1.2vw + 10px, 18px);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f8fafc;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
    line-height: auto;
  }

  /* Responsive generic headers to fix contextual sizing on mobile */
  h1 { font-size: clamp(1.8rem, 4vw, 2.5rem); }
  h2 { font-size: clamp(1.4rem, 3vw, 2rem); }
  h3 { font-size: clamp(1.1rem, 2vw, 1.5rem); }
  p, span, div, button, input {
    /* We don't force a hard px on divs so they can inherit nicely */
  }

  /* Make sure images/svgs shrink gracefully */
  img, svg {
    max-width: 100%;
    height: auto;
  }

  /* Improve default form responsiveness */
  input, select, textarea, button {
    font-family: inherit;
    max-width: 100%;
  }
`;

export default GlobalStyles;