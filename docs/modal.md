# Modal
> svelte-doric/core/modal

Base component to display modal content on screen.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `clear` | _boolean_ | | If true, the modal will be transparent
| `open` | _boolean_ | | Controls if the modal is displayed or not

## Events
- close

## Usage
```html
<Modal clear open on:close>
    Modal Content
</Modal>
```
