# Baseline
Baseline CSS for an application.

Instead of taking in props, a baseline component renders style tags and adding
external fonts using `svelte:head`

`Baseline` can be extended by rendering it as a child and rendering
additional style tags afterwards in the htmlx.

## Baseline CSS
Within a `svelte:head`
```html
<link
    href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700"
    rel="stylesheet"
    type="text/css"
/>
<link
    href="https://fonts.googleapis.com/css?family=Inconsolata:300,400,500,700"
    rel="stylesheet"
    type="text/css"
/>
<link
    href="https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined"
    rel="stylesheet"
/>
```
CSS render in a `<style>` tag
```css
:global(*) {
    box-sizing: border-box;
}
:global(html) {
    margin: 0px;
    padding: 0px;
    width: 100%;
    height: 100%;
}
:global(body) {
    margin: 0px;
    padding: 0px;
    width: 100%;
    height: 100%;
    -webkit-tap-highlight-color: transparent;

    font-family: var(--font);
    background-color: var(--background);
    color: var(--text-normal);
    font-size: var(--text-size);

    --button-default-fill: #aaaaaa;
    --button-default-text: var(--text-dark);
    --button-primary: var(--primary);
    --button-primary-text: var(--text-dark);
    --button-primary-ripple: var(--primary-ripple);
    --button-secondary: var(--secondary);
    --button-secondary-text: var(--text-dark);
    --button-secondary-ripple: var(--secondary-ripple);
    --button-danger: var(--danger);
    --button-danger-text: var(--text-dark);
    --button-danger-ripple: var(--danger-ripple);
    --button-filled-ripple: var(--ripple-invert);

    --card-background: var(--background-layer);
    --card-border: var(--layer-border-width) solid var(--layer-border-color);

    --control-border: var(--text-secondary);
    --control-border-focus: var(--primary);
    --control-border-error: var(--danger);

    --title-bar-background: var(--primary);
    --title-bar-text: var(--text-invert);
}
```
