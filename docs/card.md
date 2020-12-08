# Card

Container component for displaying information that should be contained
separately from the surrounding content.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the `Card`

## Child Tags
| Tag Name | Description |
| --- | --- |
| `card-actions` | An area for putting components to allow the user to interact with the card
| `card-content` | Adds some padding for content that shouldn't be flush with the edges of the card

## Usage
```html
<Card class>
    <card-content>
        Content
    </card-content>
    <card-actions>
        Action components
    </card-actions>
</Card>
```
