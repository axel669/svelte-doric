Fancier looking single line text input.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)
| `disabled` | _boolean_ | `false` | If true, disables interaction with the `TextInput`
| `error` | _string_ | | Changes the color of the input border/label to red and overrides the extra text at the bottom
| `extra` | _string_ | | Extra text to show at the bottom of the `TextInput`
| `flat` | _boolean_ | | Changes the text input border style to the regular material style
| `label` | _string_ | | Label for the `TextInput`
| `type` | _string_ | `"text"` | Input type. Primarily used to affect the keyboard display on mobile devices. Only tested with `"text"`, `"password"`, `"number"`
| `value` | _any_ | | Value to use with Svelte `:bind`. See binding values on `<input>` tags for more detail
| `validation` | _function_ | `null` | A validation function that runs when the value is updated. See next section for API details. Post-transform value is always used for validation
| `transform` | _function_ | `null` | A transform function that runs when the value is updated and on first render. Can return any value type because it does not assign back to `value`
| `tvalue` | _any_ | | The prop that the transform function outputs to (so that weird conditions with value dont happen). Setting this prop has no affect on the input, use `bind:tvalue` to recieve transformed values

## Validation
The validate function should return a string containing an error message if the
value of the input is invalid, or `null` to indicate the value passes
validation. When validation fails, `tvalue` will be set to `undefined` even if
the transform function compeltes succesfully.

## Slots
- start
- end

## Events
- blur
- focus

## Usage
```svelte
<script>
    let value = ""
</script>

<TextInput bind:value {class} {label} {info} {class} {error} {type} disabled />
<TextInput bind:value flat />

<TextInput>
    <Text adorn slot="start">
        <Icon name="search" />
    </Text>
</TextInput>
<TextInput label="Currency">
    <Text adorn slot="start">$</Text>
</TextInput>

<TextInput label="Search Params" error="Who even knows">
    <Button adorn slot="end">Find</Button>
</TextInput>

<TextInput
    {validate}
    {transform}
    col="span 2"
    label="Transform + Validate"
    extra="List of words, comma separated, outputs array"
    bind:tvalue={transformed}
/>
```
