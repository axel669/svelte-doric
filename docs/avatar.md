# Avatar
Small icon-like component that supports images and text as content.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `background` | _string_ | | Background color for the avatar. shows behind text or behind cropped portions of images
| `image` | _string_ | | URL for an image to show in the avatar
| `imageSize` | _string_ | `"contain"` | The fit function that should be used if the avatar is showing an image
| `size` | _string_ | `"36px"` | The size of the avatar element (width & height). Value needs to include css units
| `textColor` | _string_ | | Text color if the avatar is showing text

## Usage
```html
<Avatar size background textColor>
    Avatar Text
</Avatar>

<Avatar size image imageSize />
```
