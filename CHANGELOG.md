## 1.9.0

### Utils
- added onChange
- added grid util
- made hash store settable

### Components
- removed custom event code (no longer needed)
- removed ripple effect
    - replaced with pure css effect for performance
- removed Checkbox
- removed Switch
- added Toggle component
- converted on:tap to on:click in all components
- fix AppBar adornment recoloring
- ControlDrawer and Drawer heights fixed
- rebuilt TextInput to modify layout and remove number of nodes required
- List and Table body elements now get paginated item list as prop
- Grid now has areas prop for grid-template-areas
    - many components now have col, row, and area props to interact with grids

### Site
- made component list scroll independant of theme selection
- component buttons now act as links (support for ctrl+click too)
