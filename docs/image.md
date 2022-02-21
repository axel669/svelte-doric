# Image
> svelte-doric

Component for showing images within defined areas using fit functions.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `alt` | _string_ | | Image alt text
| `height` | _string_ | | Height of the image. Include CSS units
| `fit` | _string_ | `"contain"` | Image fit algorithm to use. See [CSS object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) supported values
| `float` | _string_ | | Image float position. Image will not float if not defined
| `soruce` | _string_ | | The image source. Anything supported by the `img` tag is allowed
| `width` | _string_ | | Width of the image. Include CSS units

## Usage
```html
<Image alt="" fit="cover" source={url} />
```
