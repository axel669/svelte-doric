# TextArea
Fancier looking multi line text input.

Use [`Adornment`](./adornment.md) with `"start"` and `"end"` positions to add
icons & controls related to the input.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the component
| `disabled` | _boolean_ | `false` | If true, disables interaction with the `TextArea`
| `error` | _string_ | | Error text to show under the `TextArea`
| `label` | _string_ | | Label for the `TextArea`
| `info` | _string_ | | Informational text to show at the bottom of the `TextArea`
| `value` | _any_ | | Value to use with Svelte `:bind`. See binding values on `<input>` tags for more detail
| `variant` | _string_ | | `TextArea` style variation. Valid options are: `"normal"`, `"outline"`

## Usage
```html
<script>
    let value = ""
</script>

<TextArea bind:value {class} {label} disabled />
<TextArea bind:value {class} {label} {info} {class} />
<TextArea bind:value {class} {label} {error} />
<TextArea bind:value {class} {label} {info} variant="outline" />

<TextArea>
    <Adornment position="start">
        <Icon name="search" />
    </Adornment>
</TextArea>
```
