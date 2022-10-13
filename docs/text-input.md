# TextInput

Fancier looking single line text input.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the component
| `disabled` | _boolean_ | `false` | If true, disables interaction with the `TextInput`
| `error` | _string_ | | Changes the color of the input border/label to red
| `extra` | _string_ | | Extra text to show at the bottom of the `TextInput`
| `flat` | _boolean_ | | Changes the text input border style to the regular material style
| `label` | _string_ | | Label for the `TextInput`
| `type` | _string_ | `"text"` | Input type. Primarily used to affect the keyboard display on mobile devices. Only tested with `"text"`, `"password"`, `"number"`
| `value` | _any_ | | Value to use with Svelte `:bind`. See binding values on `<input>` tags for more detail

## Supported Adornment Slots
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
    <Adornment slot="start">
        <Icon name="search" />
    </Adornment>
</TextInput>
<TextInput label="Currency">
    <Adornment slot="start">
        $
    </Adornment>
</TextInput>
```
