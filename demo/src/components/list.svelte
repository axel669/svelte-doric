<script>
    import {
        Adornment,
        Avatar,
        Card,
        CardContent,
        Checkbox,

        Divider,
        List,
        ListHeader,
        ListItem,
        ListItemContent,
    } from "#lib"

    const items = Array.from(
        {length: 3},
        (_, i) => `Item ${i + 1}`
    )
    const color = [
    ]

    const images = [
        "https://banner2.cleanpng.com/20180411/idq/kisspng-mega-man-universe-mega-man-6-mega-man-battle-netwo-megaman-5acdbe2e8274f1.4622027515234330065344.jpg",
        "https://art.pixilart.com/8ef4ae1d162cdb9.png",
    ]
;</script>

<style>
</style>

<Card>
    <List>
        <ListHeader color="primary">
            Image Avatars
        </ListHeader>
        {#each items as item, index}
            <ListItem clickable>
                <Adornment position="start">
                    <Avatar image={images[index % 2]} />
                </Adornment>
                <ListItemContent>
                    {item}
                </ListItemContent>
            </ListItem>
            <Divider />
        {/each}

        <ListHeader color="secondary">
            Text Avatars
        </ListHeader>
        {#each items as item, index}
            <ListItem clickable>
                <Adornment position="start">
                    <Avatar>{index * 50}</Avatar>
                </Adornment>
                <ListItemContent>
                    {item}
                </ListItemContent>
            </ListItem>
            <Divider />
        {/each}

        <ListHeader>
            Checkboxes:
        </ListHeader>
        {#each items as item, index}
            <ListItem>
                <ListItemContent control>
                    <Checkbox>
                        Label: {item}
                    </Checkbox>
                </ListItemContent>
            </ListItem>
            <Divider />
        {/each}
    </List>
</Card>
