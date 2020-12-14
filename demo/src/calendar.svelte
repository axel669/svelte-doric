<script context="module">
    const daysBase = Array.from({length: 42}, (_, i) => i)
    const mapDays = base => {
        const start = new Date(base)
        start.setDate(1)
        start.setDate(
            start.getDate() - start.getDay()
        )
        return daysBase.map(
            i => {
                const t = new Date(start)
                t.setDate(t.getDate() + i)
                return [
                    t.getMonth() === base.getMonth(),
                    (
                        t.getMonth() === base.getMonth()
                        && t.getDate() === base.getDate()
                    ),
                    t
                ]
            }
        )
    }
</script>
<script>
    import {
        Adornment,
        Button,
        Card,
        Icon,
        TitleBar,
    } from "#lib"

    export let date = new Date()

    let view
    $: view = new Date(
        date.getYear(),
        date.getMonth(),
        1
    )
    const dec = () => {
        view = new Date(
            view.getFullYear(),
            view.getMonth() - 1
        )
    }
    const inc = () => {
        view = new Date(
            view.getFullYear(),
            view.getMonth() + 1
        )
    }

    $: title = view.toLocaleString(
        "en-US",
        {
            month: "long",
            year: "numeric",
        }
    )
    $: days = mapDays(view)
</script>

<style>
    title-text {
        justify-content: center;
    }
    calendar-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        grid-auto-rows: 40px;
        gap: 4px;
        padding: 4px;
    }
</style>

<Card>
    <TitleBar>
        <Adornment position="start">
            <Button round="40px" fab>
                <Icon name="arrow_left" on:tap={dec} />
            </Button>
        </Adornment>
        <title-text>
            {title}
        </title-text>
        <Adornment position="end">
            <Button round="40px" fab>
                <Icon name="arrow_right" on:tap={inc} />
            </Button>
        </Adornment>
    </TitleBar>
    <calendar-days>
        {#each days as [inMonth, selected, day], index (index)}
            {#if inMonth}
                {#if selected}
                    <Button variant="fill" on:tap={() => date = day} color="primary">
                        {day.getDate()}
                    </Button>
                {:else}
                    <Button variant="outline" on:tap={() => date = day}>
                        {day.getDate()}
                    </Button>
                {/if}
            {:else}
                <Button disabled>
                    {day.getDate()}
                </Button>
            {/if}
        {/each}
    </calendar-days>
</Card>
