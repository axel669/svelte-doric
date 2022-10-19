# Modal

Base component to display modal content on screen.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `clear` | _boolean_ | | If true, the modal will be transparent
| `open` | _boolean_ | | Controls if the modal is displayed or not
| `persistent` | _boolean_ | `false` | If true, cliking the space surrounding a dialog box will not close the modal

## Events
- close

## Usage
```svelte
<Modal clear bind:open on:close persistent>
    Modal Content
</Modal>
```
