<script>
import {
    AppTheme,
    Baseline as baseline,
    DarkTheme,
    LightTheme,

    Adornment,
    AppBar,
    Button,
    Divider,
    Drawer,
    Icon,
    List,
    ListItem,
    ListHeader,
    ListItemContent,
    Checkbox,
} from "#lib"

import AppBarDemo from "./components/app-bar.svelte"
import ButtonDemo from "./components/button.svelte"
import ListDemo from "./components/list.svelte"

// const images = {
//     tifa: "https://media.discordapp.net/attachments/641431274916937738/726691343111553065/tifa_bikini_alt_by_nopeys_ddyq6fp-fullview.png?width=606&height=937",
//     camilla: "https://media.discordapp.net/attachments/641431274916937738/726691793801838642/dcqeyjp-bba7f4f5-a6f0-4b2f-8f15-13967385a3f7.png?width=571&height=937",
//     samus: "https://i.etsystatic.com/17439113/r/il/9346c1/2039257844/il_570xN.2039257844_jh20.jpg",
//     dnd: "https://media.discordapp.net/attachments/511777706438950922/728027209377513582/3l5ovvzru9851.png",
// }
// const image = images.dnd

let checked = JSON.parse(localStorage.themeToggle ?? "false")
;$: theme = (checked === true) ? DarkTheme : LightTheme
;$: localStorage.themeToggle = JSON.stringify(checked)
// const theme = darkTheme
// const theme = lightTheme
// const theme = DarkTheme

let open = false
const openDrawer = () => open = true
const closeDrawer = () => open = false

const demos = [
    "app-bar",
    "button",
    "list",
]

;</script>

<style>
/* :global(body) {
    background-image: url(https://media.discordapp.net/attachments/641431274916937738/726691343111553065/tifa_bikini_alt_by_nopeys_ddyq6fp-fullview.png);
    background-image: url(https://media.discordapp.net/attachments/511777706438950922/728027209377513582/3l5ovvzru9851.png);
    background-position: center center;
    background-repeat: repeat;
    background-attachment: fixed;
    backdrop-filter: opacity(10%);
} */

page-layout {
    display: grid;
    grid-template-rows: min-content auto;
}
demo-area {
    display: block;
    width: 100%;
    max-width: 1024px;
    margin: auto;
}
</style>

<AppTheme {theme} {baseline} />

<page-layout>
    <AppBar>
        <Adornment position="start">
            <Button on:click={openDrawer} round="40px" fab>
                <Icon name="menu" size="22px" />
            </Button>
        </Adornment>
        <app-title>
            Svelte Doric Components
        </app-title>

        <Adornment position="end">
            <Checkbox
                bind:checked
                uncheckedIcon="brightness_high"
                checkedIcon="brightness_low"
            />
        </Adornment>
    </AppBar>
    <div>
        <demo-area>
            <AppBarDemo />
            <ButtonDemo />
            <ListDemo />
        </demo-area>
    </div>
</page-layout>

<Drawer bind:open on:close={closeDrawer}>
    <div style="width: 15vw;" />
    <List>
        <ListHeader color="primary">
            Components
        </ListHeader>

        {#each demos as demo}
            <ListItem href="#{demo}">
                <ListItemContent>
                    {demo.replace(/\b\w/g, s => s.toUpperCase())}
                </ListItemContent>
            </ListItem>
        {/each}
    </List>
</Drawer>
