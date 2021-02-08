# Control
Base component for building up controls. Intended to be used within components
instead of as a standalone component.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `error` | _string_ | | Error string to show. If set, control will have the `danger` color
| `label` | _string_ | | Label to show on the control
| `info` | _string_ | | Information label to show on the control. Shows on the bottom, intended to suppliment the `label`
| `variant` | _string_ | | `Control` border style variation. Valid options are `"normal"`, and `"outline"`
| `klass` | _string_ | | Additional CSS classes to apply to the component

## Usage
```html
<Control label variant klass info>
    Underlying control components
</Control>
<Control label variant klass error>
    Underlying control components
</Control>
```
