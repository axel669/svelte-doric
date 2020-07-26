<script>
    import {css} from "../style/css.js"
    const theme = css`
        body {
            --font: Roboto;
            --background: #dbdbdb;
            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;
            --primary: #1d62d5;
            --primary-light: #79c0f7;

            --text-normal: var(--text-dark);
            --text-secondary: #505050;
            --text-invert: var(--text-light);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-dark);
            --ripple-invert: var(--ripple-light);

            --app-bar-background: var(--primary);
            --app-bar-text: var(--text-light);

            --button-default-fill: #aaaaaa;
            --button-default-text: var(--text-dark);
            --button-primary: var(--primary);
            --button-primary-text: var(--text-light);
            --button-primary-ripple: #1d62d560;
            --button-secondary: #128f12;
            --button-secondary-text: var(--text-light);
            --button-secondary-ripple: #128f1260;
            --button-danger: #F44336;
            --button-danger-text: var(--text-light);
            --button-danger-ripple: #F4433660;
            --button-filled-ripple: var(--ripple-dark);

            --card-background: #eeeeee;
            --card-border: 0px solid transparent;

            --control-background: #f8f8f8;
        }
    `
;</script>

{@html theme}
