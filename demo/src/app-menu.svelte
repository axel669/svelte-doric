<script>
    import {
        Button,
        Flex,
    } from "@core"

    import ThemePicker, { currentTheme, theme } from "./test/theme-picker.svelte"

    export let close

    const current = $currentTheme
    $: if ($currentTheme !== current) {
        close($currentTheme)
    }
</script>

<Flex padding="0px">
    <ThemePicker vertical />
    <Button on:tap={() => close()}>
        Cancel
    </Button>
</Flex>
