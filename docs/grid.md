# Grid

Layout that uses grid under the hood to layout items with a few common
styles applied.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `autoCol` | _string_ | | Shorthand for `grid-auto-columns`
| `autoRow` | _string_ | | Shorthand for `grid-auto-rows`
| `cols` | _string_ | | Shorthand for `grid-template-columns`
| `direction` | _string_ | `"row"` | Shorthand for `grid-auto-flow`
| `rows` | _string_ | | Shorthand for `grid-template-rows`
| `scrollable` | _boolean_ | `false` | Allow the grid to scroll when content overflows

## Usage
```svelte
<Grid direction cols autoRows scrollable>
    ...actions
</Grid>
```
