# Theme
Theme in svelte-doric are collections of CSS variables that are rendered using
a `<style>` tag.

Themes can be extended by rendering it as a child and rendering additional
style tags afterwards in the htmlx.

Default Themes:
- `LightTheme`
- `DarkTheme`
- `TronTheme`

## LightTheme

Basic theme with lighter colors.
```css
/* Variables */
{
    --font: Roboto;
    --background: #e9e9e9;
    --background-layer: #ffffff;
    --layer-border-width: 1px;
    --layer-border-color: #aaaaaa;

    --ripple-dark: #00000060;
    --ripple-light: #FFFFFF60;
    --text-light: white;
    --text-dark: black;

    --primary: #1d62d5;
    --primary-light: #79c0f7;
    --primary-ripple: #1d62d560;
    --secondary: #128f12;
    --secondary-ripple: #128f1260;
    --danger: #F44336;
    --danger-ripple: #F4433660;
    --button-filled-text-color: var(--text-invert);

    --text-normal: var(--text-dark);
    --text-secondary: #505050;
    --text-invert: var(--text-light);

    --text-size: 14px;
    --text-size-title: 18px;
    --text-size-header: 16px;
    --text-size-info: 13px;
    --text-size-subtitle: 12px;

    --ripple-normal: var(--ripple-dark);
    --ripple-invert: var(--ripple-light);
}
```

## DarkTheme

Darker colors to reduce power usage on screens.
```css
/* Variables */
{
    --font: Roboto;
    --background: #161616;
    --background-layer: #333333;
    --layer-border-width: 1px;
    --layer-border-color: var(--text-normal);

    --ripple-dark: #00000060;
    --ripple-light: #FFFFFF60;
    --text-light: white;
    --text-dark: black;

    --primary: #00aaff;
    --primary-light: #79c0f7;
    --primary-ripple: #00aaff60;
    --secondary: #2fbc2f;
    --secondary-ripple: #2fbc2f60;
    --danger: #df5348;
    --danger-ripple: #df534860;
    --button-filled-text-color: var(--text-normal);

    --text-normal: var(--text-light);
    --text-secondary: #a0a0a0;
    --text-invert: var(--text-dark);

    --text-size: 14px;
    --text-size-title: 18px;
    --text-size-header: 16px;
    --text-size-info: 13px;
    --text-size-subtitle: 12px;

    --ripple-normal: var(--ripple-light);
    --ripple-invert: var(--ripple-dark);
}
```

## TronTheme

Dark color, high contrast theme reminiscent of the _TRON: Legacy_ movie.
```css
/* Variables */
{
    --font: Orbitron;
    --background: #030303;
    --background-layer: #04080C;
    --layer-border-width: 1px;
    --layer-border-color: #00EEEE;
    --title-bar-background: #00EEEE;

    --ripple-dark: #00000060;
    --ripple-light: #FFFFFF60;
    --text-light: white;
    --text-dark: black;

    --primary: #00aaff;
    --primary-light: #79c0f7;
    --primary-ripple: #00aaff60;
    --secondary: #2fbc2f;
    --secondary-ripple: #2fbc2f60;
    --danger: #df5348;
    --danger-ripple: #df534860;
    --button-filled-text-color: var(--text-normal);

    --text-normal: var(--text-light);
    --text-secondary: #a0a0a0;
    --text-invert: var(--text-dark);

    --text-size: 14px;
    --text-size-title: 18px;
    --text-size-header: 16px;
    --text-size-info: 13px;
    --text-size-subtitle: 12px;

    --ripple-normal: var(--ripple-light);
    --ripple-invert: var(--ripple-dark);
    --shadow-color: rgb(255, 255, 255, 0.25);
}
```
