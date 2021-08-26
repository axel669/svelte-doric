# TextInput
Fancier looking single line text input.

Use [`Adornment`](./adornment.md) with `"start"` and `"end"` positions to add
icons & controls related to the input.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the component
| `disabled` | _boolean_ | `false` | If true, disables interaction with the `TextInput`
| `error` | _string_ | | Error text to show under the `TextInput`
| `label` | _string_ | | Label for the `TextInput`
| `info` | _string_ | | Informational text to show at the bottom of the `TextInput`
| `type` | _string_ | `"text"` | Input type. Primarily used to affect the keyboard display on mobile devices. Only tested with `"text"`, `"password"`, `"number"`
| `value` | _any_ | | Value to use with Svelte `:bind`. See binding values on `<input>` tags for more detail
| `variant` | _string_ | | `TextInput` style variation. Valid options are: `"normal"`, `"outline"`

## Supported Adornment Positions
- start
- end

## Events
- blur
- focus

## Usage
```html
<script>
    let value = ""
</script>

<TextInput bind:value {class} {label} {info} {class} {error} {type} disabled />
<TextInput bind:value variant="outline" />

<TextInput>
    <Adornment position="start">
        <Icon name="search" />
    </Adornment>
</TextInput>
<TextInput label="Currency">
    <Adornment position="start">
        $
    </Adornment>
</TextInput>
```
