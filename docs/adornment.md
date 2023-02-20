The `adorn` prop allows some components to be marked as being used for
adornments within other components. Setting to `true` will cause some components
to resize to fit better as adornments. Setting to `"no-reskin"` will prevent the
`Appbar` component from applying its color overrides to the component (and its
children for layouts).

## Usage
```svelte
<TextInput label="Cost">
    <Text adorn slot="start">
        $
    </Text>
</TextInput>

<AppBar>
    <Button on:tap={openMenu} adorn="no-reskin" slot="menu">
        <Icon name="menu" />
    </Button>
</AppBar>
```
