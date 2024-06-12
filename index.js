require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

client.once('ready', () => {
    console.log('Bot is ready!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'createpoll') {
        const title = interaction.options.getString('title');

        const filter = response => {
            return response.author.id === interaction.user.id && response.attachments.size > 0;
        };

        interaction.reply({ content: 'Please attach an image for the poll within the next 60 seconds, or type "skip" to create the poll without an image.', ephemeral: true });

        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] })
            .catch(() => {
                interaction.followUp({ content: 'No image provided. Creating poll without an image.', ephemeral: true });
                return null;
            });

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(EMOJIS.map((emoji, index) => `${emoji}: \n`).join('\n'))
            .setColor(0x00AE86);

        if (collected && collected.size > 0) {
            const imageAttachment = collected.first().attachments.first();
            embed.setImage(imageAttachment.url);
        }

        const pollMessage = await interaction.followUp({ embeds: [embed], fetchReply: true });

        for (const emoji of EMOJIS) {
            await pollMessage.react(emoji);
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (!EMOJIS.includes(reaction.emoji.name)) return;

    const message = await reaction.message.fetch();
    const embed = message.embeds[0];
    const updatedDescription = embed.description.split('\n').map(line => {
        if (line.startsWith(reaction.emoji.name)) {
            const userMentions = line.split(': ')[1].split(', ').filter(Boolean);
            const userMention = `<@${user.id}>`;
            if (!userMentions.includes(userMention)) {
                userMentions.push(userMention);
            }
            return `${reaction.emoji.name}: ${userMentions.join(', ')}`;
        }
        return line;
    }).join('\n');

    const updatedEmbed = new EmbedBuilder(embed)
        .setDescription(updatedDescription);

    await message.edit({ embeds: [updatedEmbed] });
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (!EMOJIS.includes(reaction.emoji.name)) return;

    const message = await reaction.message.fetch();
    const embed = message.embeds[0];
    const updatedDescription = embed.description.split('\n').map(line => {
        if (line.startsWith(reaction.emoji.name)) {
            const userMentions = line.split(': ')[1].split(', ').filter(Boolean).filter(mention => mention !== `<@${user.id}>`);
            return `${reaction.emoji.name}: ${userMentions.join(', ')}`;
        }
        return line;
    }).join('\n');

    const updatedEmbed = new EmbedBuilder(embed)
        .setDescription(updatedDescription);

    await message.edit({ embeds: [updatedEmbed] });
});

client.login(process.env.DISCORD_TOKEN);