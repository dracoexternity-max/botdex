const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, Collection, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');

// ============================================
// EXPRESS SERVER UNTUK RENDER PORT BINDING
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware basic
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// HEALTH CHECK ENDPOINTS (UNTUK RENDER)
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Discord Shop & Ticket System',
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  const bot = global.client?.user ? {
    tag: global.client.user.tag,
    id: global.client.user.id,
    status: global.client.status
  } : null;
  
  res.json({
    bot: bot,
    guilds: global.client?.guilds?.cache.size || 0,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Uptime endpoint
app.get('/uptime', (req, res) => {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  res.json({
    uptime: uptime,
    formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available: ['/', '/health', '/status', '/uptime']
  });
});

// ============================================
// START EXPRESS SERVER
// ============================================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`✅ Express server running on port ${PORT}`);
  console.log('='.repeat(50));
});

// ============================================
// DISCORD BOT CODE - OPTIMIZED
// ============================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ]
});

// Export client untuk global access
global.client = client;

// ============================================
// ADVANCED RATE LIMIT SYSTEM
// ============================================

class RateLimiter {
    constructor() {
        this.commands = new Collection();
        this.interactions = new Collection();
        this.messages = new Collection();
        
        // Settings yang lebih longgar untuk mencegah rate limit
        this.settings = {
            command: 2000,      // 2 detik antar command
            interaction: 1000,  // 1 detik antar interaksi
            message: 500,       // 0.5 detik antar pesan
            cleanupInterval: 300000 // Cleanup setiap 5 menit
        };
        
        // Start cleanup interval
        setInterval(() => this.cleanup(), this.settings.cleanupInterval);
    }
    
    // Cek rate limit untuk command
    checkCommand(userId, commandName) {
        const key = `${userId}_${commandName}`;
        const now = Date.now();
        const lastTime = this.commands.get(key);
        
        if (lastTime && now - lastTime < this.settings.command) {
            return {
                limited: true,
                waitTime: Math.ceil((this.settings.command - (now - lastTime)) / 1000)
            };
        }
        
        this.commands.set(key, now);
        return { limited: false };
    }
    
    // Cek rate limit untuk interaksi (dropdown, button, modal)
    checkInteraction(userId, interactionId) {
        const key = `${userId}_${interactionId}`;
        const now = Date.now();
        const lastTime = this.interactions.get(key);
        
        // Interaksi UI lebih longgar
        if (lastTime && now - lastTime < this.settings.interaction) {
            return {
                limited: true,
                waitTime: Math.ceil((this.settings.interaction - (now - lastTime)) / 1000)
            };
        }
        
        this.interactions.set(key, now);
        return { limited: false };
    }
    
    // Cek rate limit untuk pesan reguler
    checkMessage(userId) {
        const now = Date.now();
        const lastTime = this.messages.get(userId);
        
        if (lastTime && now - lastTime < this.settings.message) {
            return {
                limited: true,
                waitTime: Math.ceil((this.settings.message - (now - lastTime)) / 1000)
            };
        }
        
        this.messages.set(userId, now);
        return { limited: false };
    }
    
    // Reset rate limit untuk user tertentu
    resetUser(userId) {
        for (const [key] of this.commands.entries()) {
            if (key.startsWith(`${userId}_`)) {
                this.commands.delete(key);
            }
        }
        
        for (const [key] of this.interactions.entries()) {
            if (key.startsWith(`${userId}_`)) {
                this.interactions.delete(key);
            }
        }
        
        this.messages.delete(userId);
    }
    
    // Cleanup data lama
    cleanup() {
        const now = Date.now();
        
        // Cleanup commands older than 5 minutes
        for (const [key, timestamp] of this.commands.entries()) {
            if (now - timestamp > 300000) {
                this.commands.delete(key);
            }
        }
        
        // Cleanup interactions older than 5 minutes
        for (const [key, timestamp] of this.interactions.entries()) {
            if (now - timestamp > 300000) {
                this.interactions.delete(key);
            }
        }
        
        // Cleanup messages older than 5 minutes
        for (const [key, timestamp] of this.messages.entries()) {
            if (now - timestamp > 300000) {
                this.messages.delete(key);
            }
        }
    }
}

// Inisialisasi rate limiter
const rateLimiter = new RateLimiter();

// ============================================
// 1. SISTEM SHOP CATALOG
// ============================================

// Konfigurasi produk
const products = {
    vidio: {
        name: 'Vidio',
        description: 'Akses Vidio Premium',
        price: '18.000 (MOBILE)\n22.000 (PRIVATE)\n23.000 (ALL DEVICE)',
        stock: 'Tersedia',
        details: 'VIDIO PREMIUM\n\n• 1 MONTH: 18.000 (MOBILE)\n• 1 MONTH: 22.000 (PRIVATE)\n• 1 MONTH: 23.000 (ALL DEVICE)\n\n(IPIU)\n• 1 DAY: 4.000\n• 3 DAY: 8.000\n• 7 DAY: 15.000\n• 1 MONTH: 30.000'
    },
    vision: {
        name: 'Vision',
        description: 'Akses Vision+ Premium',
        price: '9.000 - 27.000',
        stock: 'Tersedia',
        details: 'VISION+ PREMIUM\n\n• 7 DAY: 9.000\n• 1 MONTH: 17.000\n• 1 MONTH: 27.000 (PRIVATE)'
    },
    spotify: {
        name: 'Spotify',
        description: 'Akses Spotify Premium',
        price: '21.000 - 30.000',
        stock: 'Tersedia',
        details: 'SPOTIFY PREMIUM\n\n• 1 MONTH: 21.000\n• 2 MONTH: 30.000'
    },
    netflix: {
        name: 'Netflix',
        description: 'Akses Netflix Premium',
        price: '4.000 - 30.000',
        stock: 'Tersedia',
        details: 'NETFLIX PREMIUM\n\n• 1 DAY: 4.000\n• 3 DAY: 8.000\n• 7 DAY: 15.000\n• 1 MONTH: 30.000'
    },
    canva: {
        name: 'Canva',
        description: 'Akses Canva Pro',
        price: '1.500 - 9.000',
        stock: 'Tersedia',
        details: 'CANVA PRO\n\n• 1 DAY: 1.500\n• 7 DAY: 5.000\n• 1 MONTH: 7.000\n• 3 MONTH: 9.000'
    },
    capcut: {
        name: 'CapCut',
        description: 'CapCut Pro Account',
        price: '11.000 - 27.000',
        stock: 'Tersedia',
        details: 'CAPCUT PRO\n\n• 1 MONTH: 11.000 (3 USER)\n• 1 MONTH: 27.000 (PRIVATE)'
    },
    wetv: {
        name: 'WeTV',
        description: 'Akses WeTV Premium',
        price: '8.000 - 31.000',
        stock: 'Tersedia',
        details: 'WETV PREMIUM\n\n• 1 MONTH: 8.000\n• 1 MONTH: 31.000 (PRIVATE)\n• 1 YEAR: 15.000'
    }
};

// Produk Discord Nitro & Joki
const discordProducts = {
    nitro_promo_via_link: {
        name: 'Nitro Promotion 3 Month - Via Link',
        price: '25.000',
        details: 'Nitro Promotion 3 Bulan via Link\n• Bisa untuk semua user / new user\n• Tidak diclaimkan oleh admin\n• Membutuhkan VCC sendiri'
    },
    nitro_promo_via_log: {
        name: 'Nitro Promotion 3 Month - Via Log',
        price: '45.000',
        details: 'Nitro Promotion 3 Bulan via Log\n• Bisa untuk semua user / new user\n• Diclaimkan oleh admin\n• Terima beres'
    },
    server_boost: {
        name: 'Server Boost 3 bulan (2x boost)',
        price: '30.000',
        details: 'Server Boost 3 Bulan (2x boost) kelipatan 2\n\nBenefit:\n• 2x Server Boost\n• 15% lebih banyak XP\n• 15% lebih banyak emoji\n• 15% lebih banyak file upload\n• 15% lebih banyak voice channel\n• 15% lebih banyak text channel'
    },
    akun_discord: {
        name: 'Akun discord umur 1 bulan',
        price: '15.000',
        details: 'Akun discord umur 1 bulan\n\n akun polosan discord tanpa nitro\n\nBenefit:\n• Akun fresh umur 1 bulan\n• Bisa di upgrade nitro\n• Bisa di pakai joki / boost server'
    },
    joki_quest: {
        name: 'Joki Quest Discord (Orbs)',
        price: '10.000',
        details: 'OPEN JOKI QUEST DISCORD (ORBS)\n\nBenefit:\n• Terima bares\n• Bisa quest all games\n• Quest Video\n• Dapet benefit border / item\n\nProses via login'
    }
};

// Produk Server Setup & Bot Custom
const serverProducts = {
    server_setup: {
        name: 'Setup Server Discord',
        price: '50.000 - 250.000',
        details: 'Setup Server Discord\n\nExample:\n• Store\n• Community\n• Games\n• Chill Area\n• Roblox\n• Five M\n• Samp\n• ETC / DLL\n\nNote: semua di setup dengan rapih baik bot, role, channel, sudah all in customer hanya terima jadi dan free revisi selama ticket belum di tutup'
    },
    bot_custom: {
        name: 'Bot Custom Discord',
        price: '10.000 - 300.000',
        details: 'Menerima Jasa Custom Bot Discord\n\nSupport:\n• Python\n• NodeJs\n\n**Full Request Custom Bot discord**\n\nContoh:\n• Bot Store\n• Bot Community\n• Bot Ticket\n• Dan lain lain\n\nPunya ide mau buat bot apa? langsung open ticket aja semua kita bisa!'
    }
};

// Produk Decoration
const decorationProducts = {
    decoration_nitro: {
        name: 'Decoration with Nitro',
        price: '22.000 - 65.000',
        details: '• IDR 33.000 ⪼ IDR 22.000\n• IDR 39.500 ⪼ IDR 25.000\n• IDR 52.000 ⪼ IDR 35.000\n• IDR 65.000 ⪼ IDR 42.000\n• IDR 71.000 ⪼ IDR 45.000\n• IDR 78.000 ⪼ IDR 52.000\n• IDR 91.000 ⪼ IDR 65.000'
    },
    decoration_standard: {
        name: 'Decoration Non Nitro',
        price: '28.000 - 125.000',
        details: '• IDR 39.500 ⪼ IDR 28.000\n• IDR 65.500 ⪼ IDR 40.000\n• IDR 78.000 ⪼ IDR 46.000\n• IDR 105.000 ⪼ IDR 85.000\n• IDR 125.000 ⪼ IDR 92.000\n• IDR 160.000 ⪼ IDR 125.000'
    },
    decoration_premium: {
        name: 'Bundle Jujutsu Kaisen Non Nitro',
        price: '95.000',
        details: '• BORDER\n• PROFILE EFFECT\n• NAME PLATE'
    },
    banner_design: {
        name: 'Bundle Custom Bisa Langsung Tanya Admin',
        price: 'CUSTOM PRICE',
        details: 'Custom bundle sesuai permintaan\n• Konsultasi langsung dengan admin\n• Design khusus sesuai kebutuhan\n• Harga menyesuaikan kompleksitas'
    }
};

// PRODUK GAME STEAM SHARING
const gameProducts = {
    blackmyth_wukong: {
        name: 'Black Myth: Wukong',
        price: 'Rp 35.000',
        platform: 'Steam SHARING',
        genre: 'Action RPG',
        details: 'BLACK MYTH: WUKONG\n\n• Lifetime Access\n• Steam Family Sharing\n• Bebas Antrian\n• Support 24/7'
    },
    spiderman_miles: {
        name: 'Spider-Man: Miles Morales',
        price: 'Rp 30.000',
        platform: 'Steam SHARING',
        genre: 'Action-Adventure',
        details: 'SPIDER-MAN: MILES MORALES\n\n• Full Game\n• Lifetime Update\n• No Queue\n• Instant Access'
    },
    spiderman_2: {
        name: 'Spider-Man 2',
        price: 'Rp 35.000',
        platform: 'Steam SHARING',
        genre: 'Action-Adventure',
        details: 'SPIDER-MAN 2\n\n• Complete Edition\n• All DLC Included\n• Family Sharing\n• 24/7 Support'
    },
    fc25: {
        name: 'FC 25',
        price: 'Rp 35.000',
        platform: 'Steam SHARING',
        genre: 'Sports, Football',
        details: 'FC 25\n\n• Latest Version\n• Online Mode Available\n• Lifetime Access\n• No Waiting'
    },
    fc26: {
        name: 'FC 26',
        price: 'Rp 35.000',
        platform: 'Steam SHARING',
        genre: 'Sports, Football',
        details: 'FC 26\n\n• Latest Edition\n• Multiplayer Support\n• Family Sharing\n• Instant Delivery'
    },
    silent_hill: {
        name: 'Silent Hill',
        price: 'Rp 30.000',
        platform: 'Steam SHARING',
        genre: 'Horror, Survival',
        details: 'SILENT HILL\n\n• Remastered Edition\n• Full Horror Experience\n• Lifetime Access\n• No Queue'
    },
    cyberpunk: {
        name: 'Cyberpunk 2077',
        price: 'Rp 30.000',
        platform: 'Steam SHARING',
        genre: 'Action RPG, Cyberpunk',
        details: 'CYBERPUNK 2077\n\n• Phantom Liberty DLC Included\n• All Updates\n• Family Sharing\n• 24/7 Support'
    }
};

// Konfigurasi channel SHOP
const ORDER_CHANNEL_ID = '1452593411734376490';
const DIRECT_LINK = 'https://discord.com/channels/1452584833766129686/1452593411734376490';
const ORDER_CHANNEL_MENTION = `<#${ORDER_CHANNEL_ID}>`;

// URL gambar untuk embed SHOP
const BANNER_IMAGE = 'https://image2url.com/r2/bucket1/gifs/1767794908164-5e4f7d1e-45f4-445d-8508-d73e8d9da4bd.gif';
const THUMBNAIL_IMAGE = 'https://image2url.com/r2/bucket1/images/1767693842203-a4f88e68-d87e-4764-8de6-a6fd644ca47d.blob';
const GAME_BANNER = 'https://image2url.com/r2/bucket1/gifs/1767794908164-5e4f7d1e-45f4-445d-8508-d73e8d9da4bd.gif';

// ============================================
// 2. SISTEM TICKET (OPTIMIZED)
// ============================================

const ticketConfig = {
  prefix: '!',
  ticketCategory: '── 「 ✦ ! ORDER  ! ✦ 」──',
  adminRole: 'KING',
  logChannel: '┊・🚏﹕ticket﹒logs',
  supportRoles: ['Support', 'Moderator'],
};

const colors = {
  primary: 0x5865F2,
  success: 0x57F287,
  warning: 0xFEE75C,
  error: 0xED4245,
  info: 0x3498DB
};

// Optimized cache untuk ticket
const ticketCache = {
  activeTickets: new Collection(),
  ticketCounter: new Collection(),
};

// Rate limiting untuk ticket
const ticketRateLimits = new Collection();
const TICKET_RATE_LIMIT = {
  createTicket: 30000,
  closeTicket: 10000,
};

// URL gambar untuk embed ticket
const embedImages = {
  supportSystem: 'https://image2url.com/r2/default/images/1767535768451-bff62cab-083a-41c1-961d-e4a237ae8808.blob',
  ticketLogs: 'https://image2url.com/r2/default/images/1767535768451-bff62cab-083a-41c1-961d-e4a237ae8808.blob',
  ticketClosed: 'https://image2url.com/r2/default/images/1767535768451-bff62cab-083a-41c1-961d-e4a237ae8808.blob'
};

// Helper functions untuk ticket
function isRateLimited(userId, action) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const userLimit = ticketRateLimits.get(key);
  
  if (userLimit && now - userLimit < TICKET_RATE_LIMIT[action]) {
    return true;
  }
  
  ticketRateLimits.set(key, now);
  setTimeout(() => ticketRateLimits.delete(key), TICKET_RATE_LIMIT[action]);
  return false;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours} jam ${minutes % 60} menit`;
  if (minutes > 0) return `${minutes} menit`;
  return `${seconds} detik`;
}

function isAdmin(member) {
  if (!member) return false;
  
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return true;
  }
  
  if (ticketConfig.adminRole && member.roles.cache.some(role => role.name === ticketConfig.adminRole)) {
    return true;
  }
  
  return false;
}

async function sendTempMessage(channel, content, duration = 5000) {
  try {
    const msg = await channel.send(content);
    setTimeout(() => {
      if (msg.deletable) {
        msg.delete().catch(() => {});
      }
    }, duration);
    return msg;
  } catch (error) {
    console.error('Error sending temp message:', error);
    return null;
  }
}

// ============================================
// SHOP CATALOG FUNCTIONS
// ============================================

// Fungsi untuk membuat dropdown produk streaming
function createProductDropdown() {
    const productList = new StringSelectMenuBuilder()
        .setCustomId('select_product')
        .setPlaceholder('Pilih produk yang ingin dibeli')
        .addOptions(
            {
                label: 'Vidio Premium',
                description: `Rp 18.000 - 30.000`,
                value: 'vidio'
            },
            {
                label: 'Vision+ Premium',
                description: `Rp 9.000 - 27.000`,
                value: 'vision'
            },
            {
                label: 'Spotify Premium',
                description: `Rp 21.000 - 30.000`,
                value: 'spotify'
            },
            {
                label: 'Netflix Premium',
                description: `Rp 4.000 - 30.000`,
                value: 'netflix'
            },
            {
                label: 'Canva Pro',
                description: `Rp 1.500 - 9.000`,
                value: 'canva'
            },
            {
                label: 'CapCut Pro',
                description: `Rp 11.000 - 27.000`,
                value: 'capcut'
            },
            {
                label: 'WeTV Premium',
                description: `Rp 8.000 - 31.000`,
                value: 'wetv'
            }
        );

    return new ActionRowBuilder().addComponents(productList);
}

// Fungsi untuk membuat dropdown Discord Nitro & Joki
function createDiscordDropdown() {
    const discordList = new StringSelectMenuBuilder()
        .setCustomId('select_discord')
        .setPlaceholder('Pilih layanan Discord & Gaming')
        .addOptions(
            {
                label: 'Nitro Promo 3M - Via Link',
                description: `Rp 25.000`,
                value: 'nitro_promo_via_link'
            },
            {
                label: 'Nitro Promo 3M - Via Log',
                description: `Rp 40.000`,
                value: 'nitro_promo_via_log'
            },
            {
                label: 'Server Boost 3 bulan (2x boost)',
                description: `Rp 30.000`,
                value: 'server_boost'
            },
            {
                label: 'Akun discord umur 1 bulan',
                description: `Rp 15.000`,
                value: 'akun_discord'
            },
            {
                label: 'Joki Quest Discord',
                description: `Rp 10.000`,
                value: 'joki_quest'
            }
        );

    return new ActionRowBuilder().addComponents(discordList);
}

// Fungsi untuk membuat dropdown Server Setup & Bot
function createServerDropdown() {
    const serverList = new StringSelectMenuBuilder()
        .setCustomId('select_server')
        .setPlaceholder('Pilih layanan Server & Bot')
        .addOptions(
            {
                label: 'Setup Server Discord',
                description: `Rp 50.000 - 250.000`,
                value: 'server_setup'
            },
            {
                label: 'Bot Custom Discord',
                description: `Rp 10.000 - 300.000`,
                value: 'bot_custom'
            }
        );

    return new ActionRowBuilder().addComponents(serverList);
}

// Fungsi untuk membuat dropdown Decoration
function createDecorationDropdown() {
    const decorationList = new StringSelectMenuBuilder()
        .setCustomId('select_decoration')
        .setPlaceholder('Pilih layanan Decoration')
        .addOptions(
            {
                label: 'Decoration with Nitro',
                description: 'Rp 22.000 - 65.000',
                value: 'decoration_nitro'
            },
            {
                label: 'Decoration Non Nitro',
                description: 'Rp 28.000 - 125.000',
                value: 'decoration_standard'
            },
            {
                label: 'Bundle Jujutsu Kaisen',
                description: 'Rp 95.000',
                value: 'decoration_premium'
            },
            {
                label: 'Custom Bundle',
                description: 'Custom Price',
                value: 'banner_design'
            }
        );

    return new ActionRowBuilder().addComponents(decorationList);
}

// Fungsi untuk membuat dropdown Game Steam
function createGameDropdown() {
    const gameList = new StringSelectMenuBuilder()
        .setCustomId('select_game')
        .setPlaceholder('Pilih game yang ingin dibeli')
        .addOptions(
            {
                label: 'Black Myth: Wukong',
                description: 'Rp 35.000',
                value: 'blackmyth_wukong'
            },
            {
                label: 'Spider-Man: Miles Morales',
                description: 'Rp 30.000',
                value: 'spiderman_miles'
            },
            {
                label: 'Spider-Man 2',
                description: 'Rp 35.000',
                value: 'spiderman_2'
            },
            {
                label: 'FC 25',
                description: 'Rp 35.000',
                value: 'fc25'
            },
            {
                label: 'FC 26',
                description: 'Rp 35.000',
                value: 'fc26'
            },
            {
                label: 'Silent Hill',
                description: 'Rp 30.000',
                value: 'silent_hill'
            },
            {
                label: 'Cyberpunk 2077',
                description: 'Rp 30.000',
                value: 'cyberpunk'
            }
        );

    return new ActionRowBuilder().addComponents(gameList);
}

// Fungsi untuk membuat tombol order dengan category tracking
function createOrderButtons(productId, productName, category) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Buka Channel Order')
                .setURL(DIRECT_LINK)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setCustomId(`back_${category}`)
                .setLabel('Kembali ke Catalog')
                .setStyle(ButtonStyle.Secondary)
        );
}

// Fungsi untuk membuat catalog streaming embed
function createStreamingCatalogEmbed() {
    return new EmbedBuilder()
        .setColor('#FF1493')
        .setTitle('DISC SHOP - STREAMING & APPS #1 TERMURAH')
        .setDescription('**Silahkan pilih product dibawah untuk Pembelian**\n\n**LIST PRODUCT STREAMING & APPS**')
        .setImage(BANNER_IMAGE)
        .setThumbnail(THUMBNAIL_IMAGE)
        .addFields(
            { name: 'Vidio', value: `Rp 18.000 - 30.000`, inline: true },
            { name: 'Vision+', value: `Rp 9.000 - 27.000`, inline: true },
            { name: 'Spotify', value: `Rp 21.000 - 30.000`, inline: true },
            { name: 'Netflix', value: `Rp 4.000 - 30.000`, inline: true },
            { name: 'Canva', value: `Rp 1.500 - 9.000`, inline: true },
            { name: 'CapCut', value: `Rp 11.000 - 27.000`, inline: true },
            { name: 'WeTV', value: `Rp 8.000 - 31.000`, inline: true }
        )
        .setFooter({
            text: 'DISC SHOP • Gift Available • Instant Delivery',
            iconURL: THUMBNAIL_IMAGE
        })
        .setTimestamp();
}

// Fungsi untuk membuat catalog Discord embed
function createDiscordCatalogEmbed() {
    return new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('DISC SHOP - DISCORD & GAMING SERVICES')
        .setDescription('**Layanan Discord Nitro & Joki Gaming**\n\n**PRICE LIST DISCORD & GAMING**')
        .setImage(BANNER_IMAGE)
        .setThumbnail(THUMBNAIL_IMAGE)
        .addFields(
            { name: 'Nitro Promo 3M - Via Link', value: `Rp 25.000`, inline: true },
            { name: 'Nitro Promo 3M - Via Log', value: `Rp 45.000`, inline: true },
            { name: 'Server Boost 3 bulan (2x boost)', value: `Rp 30.000`, inline: true },
            { name: 'Akun discord umur 1 bulan', value: `Rp 15.000`, inline: true },
            { name: 'Joki Quest Discord', value: `Rp 10.000`, inline: true },
            { name: 'Layanan Lainnya', value: 'DM Admin untuk custom request', inline: false }
        )
        .setFooter({
            text: 'DISC SHOP • Instant Delivery • Terima Beres',
            iconURL: THUMBNAIL_IMAGE
        })
        .setTimestamp();
}

// Fungsi untuk membuat catalog Server embed
function createServerCatalogEmbed() {
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('DISC SHOP - SERVER & BOT SERVICES')
        .setDescription('**Jasa Setup Server & Custom Bot Discord**\n\n**PRICE LIST SERVER & BOT**')
        .setImage(BANNER_IMAGE)
        .setThumbnail(THUMBNAIL_IMAGE)
        .addFields(
            { name: 'Setup Server Discord', value: `Rp 50.000 - 250.000`, inline: true },
            { name: 'Bot Custom Discord', value: `Rp 10.000 - 300.000`, inline: true },
            { name: 'Custom Request', value: 'DM Admin untuk konsultasi gratis', inline: false }
        )
        .setFooter({
            text: 'DISC SHOP • Professional Services • Free Revisi',
            iconURL: THUMBNAIL_IMAGE
        })
        .setTimestamp();
}

// Fungsi untuk membuat catalog Decoration embed
function createDecorationCatalogEmbed() {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('DISC SHOP - SERVER DECORATION SERVICES')
        .setDescription('**Jasa Decoration Server dengan Nitro & Standard**\n\n**PRICE LIST DECORATION**')
        .setImage(BANNER_IMAGE)
        .setThumbnail(THUMBNAIL_IMAGE)
        .addFields(
            { name: 'Nitro Decoration', value: 'Rp 20.000 - 65.000', inline: true },
            { name: 'Standard Decoration', value: 'Rp 28.000 - 125.000', inline: true },
            { name: 'Jujutsu Kaisen Bundle', value: 'Rp 95.000', inline: true },
            { name: 'Custom Bundle', value: 'Custom Price (Konsultasi Admin)', inline: true },
            { name: 'Includes', value: 'Border, Name Plate, Profile Effect, Custom Emoji', inline: false },
            { name: 'Konsultasi Gratis', value: 'DM Admin untuk custom request & preview', inline: false }
        )
        .setFooter({
            text: 'DISC SHOP • Creative Designs • Premium Quality',
            iconURL: THUMBNAIL_IMAGE
        })
        .setTimestamp();
}

// Fungsi untuk membuat catalog Game Steam embed
function createGameCatalogEmbed() {
    return new EmbedBuilder()
        .setColor('#7289DA')
        .setTitle('DISC SHOP - GAME STEAM SHARING TERMURAH')
        .setDescription('**Game Steam Sharing dengan Harga Terjangkau!**\n\n**DAFTAR GAME TERLARIS**')
        .setImage(GAME_BANNER)
        .setThumbnail(THUMBNAIL_IMAGE)
        .addFields(
            { name: 'Black Myth: Wukong', value: 'Rp 35.000', inline: true },
            { name: 'Spider-Man: Miles Morales', value: 'Rp 30.000', inline: true },
            { name: 'Spider-Man 2', value: 'Rp 30.000', inline: true },
            { name: 'FC 25', value: 'Rp 37.000', inline: true },
            { name: 'FC 26', value: 'Rp 74.000', inline: true },
            { name: 'Silent Hill', value: 'Rp 30.000', inline: true },
            { name: 'Cyberpunk 2077', value: 'Rp 30.000', inline: true }
        )
        .addFields(
            { 
                name: '📢 PERHATIAN! 📢', 
                value: '**NYARI GAMES YANG GA ADA DI CATALOG ? LANGSUNG CHAT ADMIN AJA ! READY ALL GAME**\n\nKami menyediakan hampir semua game di Steam! Cukup tanya admin untuk game yang kamu cari.', 
                inline: false 
            },
            { name: 'KEUNGGULAN', value: '• Steam Sharing\n• Lifetime Access\n• Bebas Antrian\n• Support 24/7\n• **READY ALL GAME - TANYA ADMIN!**', inline: false },
            { name: 'CARA ORDER', value: `Kunjungi ${ORDER_CHANNEL_MENTION} dan ketik: \`!order [nama game]\`\n**ATAU langsung chat admin untuk game yang tidak ada di catalog!**`, inline: false }
        )
        .setFooter({
            text: 'DISC SHOP • Steam Sharing • Garansi Lifetime • READY ALL GAME!',
            iconURL: THUMBNAIL_IMAGE
        })
        .setTimestamp();
}

// ============================================
// DISCORD BOT EVENTS
// ============================================

client.once('ready', () => {
  console.log('='.repeat(50));
  console.log(`🤖 Bot ${client.user.tag} logged in successfully!`);
  console.log(`🏠 Servers: ${client.guilds.cache.size}`);
  console.log(`📊 Sistem Shop: Ready! (Optimized)`);
  console.log(`🎫 Sistem Ticket: Ready! (Optimized)`);
  console.log(`⚡ Rate Limiting: Active`);
  console.log('='.repeat(50));
  
  client.user.setActivity('Shop & Ticket System | !help', { type: 'WATCHING' });
  
  // Initialize ticket counter based on existing channels
  client.guilds.cache.forEach(guild => {
    let maxTicketId = 0;
    
    guild.channels.cache.forEach(channel => {
      if (channel.name.startsWith('tiket-')) {
        const match = channel.name.match(/tiket-(\d+)-/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxTicketId) maxTicketId = num;
          
          // Track active tickets from existing channels
          if (!channel.name.startsWith('closed-')) {
            const userIdMatch = channel.name.match(/tiket-\d+-(.+)/);
            if (userIdMatch) {
              const username = userIdMatch[1];
              const member = guild.members.cache.find(m => 
                m.user.username.toLowerCase() === username.toLowerCase()
              );
              
              if (member) {
                ticketCache.activeTickets.set(member.id, {
                  channelId: channel.id,
                  guildId: guild.id,
                  userId: member.id
                });
              }
            }
          }
        }
      }
    });
    
    ticketCache.ticketCounter.set(guild.id, maxTicketId + 1);
    console.log(`📊 Guild ${guild.name}: Ticket counter set to ${maxTicketId + 1}`);
  });
  
  console.log(`🎫 Active tickets loaded: ${ticketCache.activeTickets.size}`);
});

// ============================================
// MESSAGE HANDLER (OPTIMIZED)
// ============================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Rate limiting untuk pesan reguler
    const messageLimit = rateLimiter.checkMessage(message.author.id);
    if (messageLimit.limited) {
        return; // Silent fail untuk pesan reguler
    }
    
    // SHOP CATALOG COMMANDS
    if (message.content === '!catalog' || 
        message.content === '!catalogdc' || 
        message.content === '!catalogsv' || 
        message.content === '!catalogdeco' || 
        message.content === '!cataloggame') {
        
        // Cek permissions (hanya admin)
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return sendTempMessage(message.channel, '❌ Hanya admin yang bisa menggunakan command ini!', 5000);
        }
        
        // Rate limiting untuk command catalog
        const commandLimit = rateLimiter.checkCommand(message.author.id, 'catalog');
        if (commandLimit.limited) {
            return sendTempMessage(message.channel, `⏳ Mohon tunggu ${commandLimit.waitTime} detik sebelum menggunakan command ini lagi.`, 3000);
        }
        
        let embed, dropdownRow;
        
        switch(message.content) {
            case '!catalog':
                embed = createStreamingCatalogEmbed();
                dropdownRow = createProductDropdown();
                break;
            case '!catalogdc':
                embed = createDiscordCatalogEmbed();
                dropdownRow = createDiscordDropdown();
                break;
            case '!catalogsv':
                embed = createServerCatalogEmbed();
                dropdownRow = createServerDropdown();
                break;
            case '!catalogdeco':
                embed = createDecorationCatalogEmbed();
                dropdownRow = createDecorationDropdown();
                break;
            case '!cataloggame':
                embed = createGameCatalogEmbed();
                dropdownRow = createGameDropdown();
                break;
        }
        
        try {
            await message.channel.send({ embeds: [embed], components: [dropdownRow] });
        } catch (error) {
            console.error('Error sending catalog:', error);
        }
        
        return;
    }
    
    // TICKET SYSTEM COMMANDS
    if (message.content.startsWith(ticketConfig.prefix)) {
        const args = message.content.slice(ticketConfig.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        // Rate limiting untuk command ticket
        const ticketCommandLimit = rateLimiter.checkCommand(message.author.id, `ticket_${command}`);
        if (ticketCommandLimit.limited && command !== 'help' && command !== 'ping') {
            return sendTempMessage(message.channel, `⏳ Mohon tunggu ${ticketCommandLimit.waitTime} detik sebelum menggunakan command ini lagi.`, 3000);
        }
        
        try {
            switch (command) {
                case 'setup':
                    await setupTicketSystem(message);
                    break;
                case 'ticket':
                    await createTicketCommand(message, args);
                    break;
                case 'close':
                    await closeTicketCommand(message, args);
                    break;
                case 'add':
                    await addUserToTicket(message, args);
                    break;
                case 'remove':
                    await removeUserFromTicket(message, args);
                    break;
                case 'rename':
                    await renameTicket(message, args);
                    break;
                case 'help':
                    await showHelp(message);
                    break;
                case 'ping':
                    const latency = Math.round(client.ws.ping);
                    await message.reply(`🏓 Pong! ${latency}ms`);
                    break;
                case 'logs':
                    await showTicketLogs(message);
                    break;
                case 'cleanup':
                    await cleanupTickets(message);
                    break;
            }
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            await sendTempMessage(message.channel, '❌ Error executing command!', 5000);
        }
    }
});

// ============================================
// INTERACTION HANDLER (OPTIMIZED)
// ============================================

client.on('interactionCreate', async (interaction) => {
    // SHOP CATALOG INTERACTIONS
    if (interaction.isStringSelectMenu()) {
        await handleShopSelectMenu(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith('back_')) {
        await handleBackButton(interaction);
    }
    
    // TICKET SYSTEM INTERACTIONS
    if (interaction.isButton() || interaction.isModalSubmit()) {
        await handleTicketInteraction(interaction);
    }
});

async function handleShopSelectMenu(interaction) {
    // Rate limiting untuk interaksi dropdown
    const interactionLimit = rateLimiter.checkInteraction(interaction.user.id, interaction.customId);
    if (interactionLimit.limited) {
        try {
            await interaction.reply({
                content: `⏳ Mohon tunggu ${interactionLimit.waitTime} detik sebelum berinteraksi lagi.`,
                ephemeral: true
            });
        } catch (error) {
            // Silent fail
        }
        return;
    }

    // Handle product selection streaming
    if (interaction.customId === 'select_product') {
        const productId = interaction.values[0];
        const product = products[productId];

        const detailEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`${product.name}`)
            .setDescription(product.details)
            .setImage(BANNER_IMAGE)
            .setThumbnail(THUMBNAIL_IMAGE)
            .addFields(
                { name: 'Harga', value: `Rp ${product.price}`, inline: true },
                { name: 'Stok', value: `${product.stock}`, inline: true },
                { name: 'Cara Order', value: `Tulis di ${ORDER_CHANNEL_MENTION}:\n\`\`\`!order ${product.name}\`\`\``, inline: false }
            )
            .setFooter({ 
                text: 'DISC SHOP • Klik tombol di bawah untuk langsung order',
                iconURL: THUMBNAIL_IMAGE
            })
            .setTimestamp();

        const buttonRow = createOrderButtons(productId, product.name, 'streaming');

        await interaction.reply({ 
            embeds: [detailEmbed], 
            components: [buttonRow],
            ephemeral: true
        });
    }

    // Handle Discord Nitro & Joki selection
    if (interaction.customId === 'select_discord') {
        const productId = interaction.values[0];
        const product = discordProducts[productId];

        const detailEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`${product.name}`)
            .setDescription(product.details)
            .setThumbnail(THUMBNAIL_IMAGE)
            .addFields(
                { name: 'Harga', value: `Rp ${product.price}`, inline: true },
                { name: 'Cara Order', value: `Tulis di ${ORDER_CHANNEL_MENTION}:\n\`\`\`!order ${product.name}\`\`\``, inline: false }
            )
            .setFooter({ 
                text: 'DISC SHOP • Klik tombol di bawah untuk langsung order',
                iconURL: THUMBNAIL_IMAGE
            })
            .setTimestamp();

        const buttonRow = createOrderButtons(productId, product.name, 'discord');

        await interaction.reply({ 
            embeds: [detailEmbed], 
            components: [buttonRow],
            ephemeral: true
        });
    }

    // Handle Server Setup & Bot selection
    if (interaction.customId === 'select_server') {
        const productId = interaction.values[0];
        const product = serverProducts[productId];

        const detailEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`${product.name}`)
            .setDescription(product.details)
            .setThumbnail(THUMBNAIL_IMAGE)
            .addFields(
                { name: 'Harga', value: `Rp ${product.price}`, inline: true },
                { name: 'Cara Order', value: `Tulis di ${ORDER_CHANNEL_MENTION}:\n\`\`\`!order ${product.name}\`\`\``, inline: false }
            )
            .setFooter({ 
                text: 'DISC SHOP • Klik tombol di bawah untuk langsung order',
                iconURL: THUMBNAIL_IMAGE
            })
            .setTimestamp();

        const buttonRow = createOrderButtons(productId, product.name, 'server');

        await interaction.reply({ 
            embeds: [detailEmbed], 
            components: [buttonRow],
            ephemeral: true
        });
    }

    // Handle Decoration selection
    if (interaction.customId === 'select_decoration') {
        const productId = interaction.values[0];
        const product = decorationProducts[productId];

        const detailEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${product.name}`)
            .setDescription(product.details)
            .setThumbnail(THUMBNAIL_IMAGE)
            .addFields(
                { name: 'Harga', value: `Rp ${product.price}`, inline: true },
                { name: 'Cara Order', value: `Tulis di ${ORDER_CHANNEL_MENTION}:\n\`\`\`!order ${product.name}\`\`\``, inline: false }
            )
            .setFooter({ 
                text: 'DISC SHOP • Klik tombol di bawah untuk langsung order',
                iconURL: THUMBNAIL_IMAGE
            })
            .setTimestamp();

        const buttonRow = createOrderButtons(productId, product.name, 'decoration');

        await interaction.reply({ 
            embeds: [detailEmbed], 
            components: [buttonRow],
            ephemeral: true
        });
    }

    // Handle Game Steam selection
    if (interaction.customId === 'select_game') {
        const productId = interaction.values[0];
        const product = gameProducts[productId];

        const detailEmbed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle(`${product.name}`)
            .setDescription(product.details)
            .setThumbnail(THUMBNAIL_IMAGE)
            .addFields(
                { name: 'Harga', value: `${product.price}`, inline: true },
                { name: 'Platform', value: `${product.platform}`, inline: true },
                { name: 'Genre', value: product.genre, inline: true },
                { name: 'Cara Order', value: `Tulis di ${ORDER_CHANNEL_MENTION}:\n\`\`\`!order ${product.name}\`\`\``, inline: false },
                { name: 'Garansi', value: 'Lifetime Access • Instant Delivery • Support 24/7', inline: false }
            )
            .setFooter({ 
                text: 'DISC SHOP • Steam Sharing • Garansi Lifetime • Tanya Admin untuk game lain!',
                iconURL: THUMBNAIL_IMAGE
            })
            .setTimestamp();

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Buka Channel Order')
                    .setURL(DIRECT_LINK)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setCustomId('back_game')
                    .setLabel('Kembali ke Catalog Game')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ 
            embeds: [detailEmbed], 
            components: [buttonRow],
            ephemeral: true
        });
    }
}

async function handleBackButton(interaction) {
    // Rate limiting untuk tombol kembali
    const interactionLimit = rateLimiter.checkInteraction(interaction.user.id, 'back_button');
    if (interactionLimit.limited) {
        try {
            await interaction.reply({
                content: `⏳ Mohon tunggu ${interactionLimit.waitTime} detik sebelum berinteraksi lagi.`,
                ephemeral: true
            });
        } catch (error) {
            // Silent fail
        }
        return;
    }
    
    const category = interaction.customId.replace('back_', '');
    
    let embed, dropdown;
    
    switch(category) {
        case 'streaming':
            embed = createStreamingCatalogEmbed();
            dropdown = createProductDropdown();
            break;
        case 'discord':
            embed = createDiscordCatalogEmbed();
            dropdown = createDiscordDropdown();
            break;
        case 'server':
            embed = createServerCatalogEmbed();
            dropdown = createServerDropdown();
            break;
        case 'decoration':
            embed = createDecorationCatalogEmbed();
            dropdown = createDecorationDropdown();
            break;
        case 'game':
            embed = createGameCatalogEmbed();
            dropdown = createGameDropdown();
            break;
        default:
            embed = createStreamingCatalogEmbed();
            dropdown = createProductDropdown();
    }
    
    await interaction.reply({
        embeds: [embed],
        components: [dropdown],
        ephemeral: true
    });
}

// ============================================
// TICKET SYSTEM FUNCTIONS (OPTIMIZED)
// ============================================

async function handleTicketInteraction(interaction) {
    try {
        if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat memproses permintaan Anda!',
                ephemeral: true
            }).catch(() => {});
        }
    }
}

async function handleButtonInteraction(interaction) {
    // Rate limiting untuk interaksi tombol ticket
    const interactionLimit = rateLimiter.checkInteraction(interaction.user.id, interaction.customId);
    if (interactionLimit.limited) {
        return interaction.reply({
            content: `⏳ Mohon tunggu ${interactionLimit.waitTime} detik sebelum berinteraksi lagi.`,
            ephemeral: true
        });
    }
    
    switch (interaction.customId) {
        case 'create_ticket':
            await handleCreateTicket(interaction);
            break;
        case 'close_ticket':
            await handleCloseTicketButton(interaction);
            break;
        case 'confirm_close':
            await handleConfirmClose(interaction);
            break;
        case 'cancel_close':
            await handleCancelClose(interaction);
            break;
    }
}

async function handleModalSubmit(interaction) {
    switch (interaction.customId) {
        case 'create_ticket_modal':
            await handleCreateTicketModal(interaction);
            break;
        case 'close_reason_modal':
            await handleCloseReasonModal(interaction);
            break;
    }
}

async function handleCreateTicket(interaction) {
    if (isRateLimited(interaction.user.id, 'createTicket')) {
        return interaction.reply({
            content: '⏳ Harap tunggu 30 detik sebelum membuat tiket baru!',
            ephemeral: true
        });
    }
    
    if (ticketCache.activeTickets.has(interaction.user.id)) {
        const ticket = ticketCache.activeTickets.get(interaction.user.id);
        return interaction.reply({
            content: `❌ Anda sudah memiliki tiket aktif: <#${ticket.channelId}>`,
            ephemeral: true
        });
    }
    
    const modal = new ModalBuilder()
        .setCustomId('create_ticket_modal')
        .setTitle('Buat Tiket Baru');
    
    const reasonInput = new TextInputBuilder()
        .setCustomId('ticket_reason')
        .setLabel('Apa yang ingin Anda beli?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Deskripsikan apa yang ingin Anda beli...')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(200);
    
    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
}

async function handleCreateTicketModal(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const reason = interaction.fields.getTextInputValue('ticket_reason');
        
        if (reason.length < 3) {
            return interaction.editReply({
                content: '❌ Alasan terlalu pendek! Minimal 3 karakter.',
                ephemeral: true
            });
        }
        
        const guild = interaction.guild;
        const user = interaction.user;
        
        let ticketNumber = ticketCache.ticketCounter.get(guild.id) || 1;
        ticketCache.ticketCounter.set(guild.id, ticketNumber + 1);
        
        let category = guild.channels.cache.find(c => 
            c.type === ChannelType.GuildCategory && 
            c.name.toUpperCase() === ticketConfig.ticketCategory.toUpperCase()
        );
        
        if (!category) {
            category = await guild.channels.create({
                name: ticketConfig.ticketCategory,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                ],
            });
        }
        
        const ticketChannel = await guild.channels.create({
            name: `tiket-${ticketNumber}-${user.username}`.toLowerCase().slice(0, 100),
            type: ChannelType.GuildText,
            parent: category.id,
            topic: `Tiket #${ticketNumber} | User: ${user.tag}`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                    ],
                },
            ],
        });
        
        const adminRole = guild.roles.cache.find(r => r.name === ticketConfig.adminRole);
        if (adminRole) {
            await ticketChannel.permissionOverwrites.edit(adminRole.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                ManageMessages: true,
            });
        }
        
        for (const roleName of ticketConfig.supportRoles) {
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (role) {
                await ticketChannel.permissionOverwrites.edit(role.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                });
            }
        }
        
        ticketCache.activeTickets.set(user.id, {
            ticketNumber: ticketNumber,
            channelId: ticketChannel.id,
            guildId: guild.id,
            userId: user.id,
            userTag: user.tag,
            createdAt: Date.now(),
            reason: reason
        });
        
        const welcomeEmbed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle(`🎫 Tiket #${ticketNumber}`)
            .setDescription(`Halo <@${user.id}>, terima kasih telah membuat tiket!`)
            .setThumbnail(embedImages.supportSystem)
            .addFields(
                { name: '📋 Permintaan', value: reason },
                { name: '👤 Dibuat oleh', value: user.tag, inline: true },
                { name: '📅 Tanggal', value: new Date().toLocaleString('id-ID'), inline: true },
                { name: '📌 Panduan', value: '• Tunggu admin merespons\n• Deskripsikan dengan jelas\n• Jangan spam' }
            )
            .setFooter({ text: 'Admin akan segera merespons!' })
            .setTimestamp();
        
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Tutup Tiket')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await ticketChannel.send({
            embeds: [welcomeEmbed],
            components: [buttonRow]
        });
        
        await interaction.editReply({
            content: `✅ **Tiket berhasil dibuat!**\nChannel: <#${ticketChannel.id}>\nID: #${ticketNumber}`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.editReply({
            content: '❌ Gagal membuat tiket. Silakan coba lagi!',
            ephemeral: true
        });
    }
}

async function handleCloseTicketButton(interaction) {
    if (!isAdmin(interaction.member)) {
        return interaction.reply({
            content: '❌ Hanya admin yang dapat menutup tiket!',
            ephemeral: true
        });
    }
    
    if (isRateLimited(interaction.user.id, 'closeTicket')) {
        return interaction.reply({
            content: '⏳ Harap tunggu 10 detik sebelum menutup tiket lain!',
            ephemeral: true
        });
    }
    
    const modal = new ModalBuilder()
        .setCustomId('close_reason_modal')
        .setTitle('Alasan Menutup Tiket');
    
    const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('Masukkan alasan menutup tiket')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Contoh: Pesanan sudah selesai...')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(200);
    
    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
}

async function handleCloseReasonModal(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const closeReason = interaction.fields.getTextInputValue('close_reason');
        const channel = interaction.channel;
        
        const ticket = Array.from(ticketCache.activeTickets.values()).find(t => 
            t.channelId === channel.id
        );
        
        if (!ticket) {
            return interaction.editReply({
                content: '❌ Channel ini bukan channel tiket yang valid!',
                ephemeral: true
            });
        }
        
        const confirmEmbed = new EmbedBuilder()
            .setColor(colors.warning)
            .setTitle('Konfirmasi Penutupan Tiket')
            .setDescription(`Anda akan menutup **Tiket #${ticket.ticketNumber}**`)
            .setThumbnail(embedImages.ticketClosed)
            .addFields(
                { name: '👤 Pembuat Tiket', value: ticket.userTag },
                { name: '📝 Alasan Penutupan', value: closeReason },
                { name: '⏱️ Durasi', value: formatDuration(Date.now() - ticket.createdAt) }
            )
            .setFooter({ text: 'Konfirmasi penutupan tiket' })
            .setTimestamp();
        
        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('✅ Ya, Tutup Tiket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('❌ Batal')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await channel.send({
            content: `<@${interaction.user.id}>`,
            embeds: [confirmEmbed],
            components: [confirmButtons]
        });
        
        await interaction.editReply({
            content: '✅ Konfirmasi penutupan dikirim!',
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error in close reason modal:', error);
        await interaction.editReply({
            content: '❌ Gagal memproses permintaan penutupan!',
            ephemeral: true
        });
    }
}

async function handleConfirmClose(interaction) {
    if (!isAdmin(interaction.member)) {
        return interaction.reply({
            content: '❌ Hanya admin yang dapat menutup tiket!',
            ephemeral: true
        });
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const channel = interaction.channel;
        
        const ticketEntry = Array.from(ticketCache.activeTickets.entries()).find(([_, t]) => 
            t.channelId === channel.id
        );
        
        if (!ticketEntry) {
            return interaction.editReply({
                content: '❌ Tiket tidak ditemukan!',
                ephemeral: true
            });
        }
        
        const [userId, ticket] = ticketEntry;
        
        let closeReason = 'Tidak ada alasan diberikan';
        try {
            const messages = await channel.messages.fetch({ limit: 5 });
            for (const msg of messages.values()) {
                if (msg.embeds[0]?.title === 'Konfirmasi Penutupan Tiket') {
                    closeReason = msg.embeds[0].fields.find(f => f.name === '📝 Alasan Penutupan')?.value || closeReason;
                    break;
                }
            }
        } catch (e) {}
        
        ticketCache.activeTickets.delete(userId);
        
        const messages = await channel.messages.fetch({ limit: 10 });
        for (const msg of messages.values()) {
            if (msg.components.length > 0) {
                await msg.edit({ components: [] }).catch(() => {});
            }
        }
        
        const closeEmbed = new EmbedBuilder()
            .setColor(colors.warning)
            .setTitle('🎫 Tiket Ditutup')
            .setDescription(`**Tiket #${ticket.ticketNumber}** telah ditutup`)
            .setThumbnail(embedImages.ticketClosed)
            .addFields(
                { name: '🔒 Ditutup oleh', value: interaction.user.tag, inline: true },
                { name: '👤 Pembuat', value: ticket.userTag, inline: true },
                { name: '📝 Alasan', value: closeReason }
            )
            .setFooter({ text: `ID: #${ticket.ticketNumber}` })
            .setTimestamp();
        
        await channel.send({ embeds: [closeEmbed] });
        
        await channel.permissionOverwrites.edit(ticket.userId, {
            SendMessages: false,
            AddReactions: false
        });
        
        await channel.setName(`closed-${ticket.ticketNumber}`.toLowerCase().slice(0, 100));
        
        await sendCloseLog(ticket, interaction.user, closeReason);
        
        try {
            const user = await client.users.fetch(ticket.userId);
            const userEmbed = new EmbedBuilder()
                .setColor(colors.info)
                .setTitle('🎫 Tiket Anda Telah Ditutup')
                .setDescription(`Tiket #${ticket.ticketNumber} telah ditutup`)
                .setThumbnail(embedImages.ticketClosed)
                .addFields(
                    { name: '🔒 Ditutup oleh', value: interaction.user.tag },
                    { name: '📝 Alasan', value: closeReason }
                )
                .setFooter({ text: 'Terima kasih telah menggunakan layanan kami' })
                .setTimestamp();
            
            await user.send({ embeds: [userEmbed] });
        } catch (err) {
            console.log(`Could not send DM to ${ticket.userTag}`);
        }
        
        await interaction.editReply({
            content: '✅ Tiket berhasil ditutup!',
            ephemeral: true
        });
        
        setTimeout(async () => {
            try {
                if (channel.deletable) {
                    await channel.delete('Tiket ditutup - Auto delete');
                }
            } catch (error) {
                console.error('Error deleting channel:', error);
            }
        }, 10000);
        
    } catch (error) {
        console.error('Error confirming close:', error);
        await interaction.editReply({
            content: '❌ Gagal menutup tiket!',
            ephemeral: true
        });
    }
}

async function handleCancelClose(interaction) {
    if (!isAdmin(interaction.member)) {
        return interaction.reply({
            content: '❌ Hanya admin yang dapat membatalkan penutupan!',
            ephemeral: true
        });
    }
    
    try {
        await interaction.message.delete();
        await interaction.reply({
            content: '✅ Penutupan tiket dibatalkan.',
            ephemeral: true
        });
    } catch (error) {
        console.error('Error cancelling close:', error);
    }
}

async function sendCloseLog(ticket, closer, closeReason) {
    const guild = client.guilds.cache.get(ticket.guildId);
    if (!guild) return;
    
    const logChannel = guild.channels.cache.find(c => 
        c.name === ticketConfig.logChannel && c.type === ChannelType.GuildText
    );
    
    if (!logChannel) return;
    
    const logEmbed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle('📋 LOG TIKET DITUTUP')
        .setDescription(`**Tiket #${ticket.ticketNumber}** telah ditutup`)
        .setThumbnail(embedImages.ticketLogs)
        .addFields(
            { name: '👤 User', value: ticket.userTag, inline: true },
            { name: '🎫 ID', value: `#${ticket.ticketNumber}`, inline: true },
            { name: '🔒 Oleh', value: closer.tag, inline: true },
            { name: '📝 Alasan', value: ticket.reason.length > 100 ? ticket.reason.slice(0, 100) + '...' : ticket.reason },
            { name: '🗒️ Alasan Penutupan', value: closeReason }
        )
        .setFooter({ text: `Ditutup pada` })
        .setTimestamp();
    
    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
}

// ============================================
// TICKET COMMAND FUNCTIONS
// ============================================

async function setupTicketSystem(message) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return sendTempMessage(message.channel, '❌ Anda memerlukan izin Administrator untuk menggunakan perintah ini!', 5000);
    }
    
    try {
        await message.delete().catch(() => {});
    } catch (error) {
        console.log('Could not delete command message');
    }
    
    const embed = new EmbedBuilder()
        .setColor(colors.primary)
        .setTitle('🎫 Support Ticket System')
        .setDescription('Klik tombol di bawah untuk membuat tiket baru')
        .setThumbnail(embedImages.supportSystem)
        .addFields(
            { name: '📝 Cara Menggunakan', value: '1. Klik tombol "Buat Tiket"\n2. Jelaskan apa yang ingin Anda beli\n3. Tunggu admin merespons' },
            { name: '⚖️ Aturan', value: '• Deskripsikan dengan jelas\n• Bersabar menunggu respons admin\n• Jangan spam atau kirim pesan tidak perlu' }
        )
        .setFooter({ text: `${message.guild.name} Support System` })
        .setTimestamp();
    
    const buttonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('🎫 Buat Tiket')
                .setStyle(ButtonStyle.Primary)
        );
    
    await message.channel.send({
        embeds: [embed],
        components: [buttonRow]
    });
}

async function createTicketCommand(message, args) {
    if (isRateLimited(message.author.id, 'createTicket')) {
        return sendTempMessage(message.channel, '⏳ Harap tunggu 30 detik sebelum membuat tiket baru!', 5000);
    }
    
    if (ticketCache.activeTickets.has(message.author.id)) {
        const ticket = ticketCache.activeTickets.get(message.author.id);
        return sendTempMessage(message.channel, `❌ Anda sudah memiliki tiket aktif: <#${ticket.channelId}>`, 10000);
    }
    
    const reason = args.join(' ');
    if (!reason || reason.length < 3) {
        return sendTempMessage(message.channel, '❌ Harap berikan alasan yang jelas (minimal 3 karakter)!', 10000);
    }
    
    const creatingMsg = await message.channel.send('⏳ **Membuat tiket...**');
    
    try {
        const guild = message.guild;
        const user = message.author;
        
        let ticketNumber = ticketCache.ticketCounter.get(guild.id) || 1;
        ticketCache.ticketCounter.set(guild.id, ticketNumber + 1);
        
        let category = guild.channels.cache.find(c => 
            c.type === ChannelType.GuildCategory && 
            c.name.toUpperCase() === ticketConfig.ticketCategory.toUpperCase()
        );
        
        if (!category) {
            category = await guild.channels.create({
                name: ticketConfig.ticketCategory,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                ],
            });
        }
        
        const ticketChannel = await guild.channels.create({
            name: `tiket-${ticketNumber}-${user.username}`.toLowerCase().slice(0, 100),
            type: ChannelType.GuildText,
            parent: category.id,
            topic: `Tiket #${ticketNumber} | User: ${user.tag}`,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory,
                    ],
                },
            ],
        });
        
        const adminRole = guild.roles.cache.find(r => r.name === ticketConfig.adminRole);
        if (adminRole) {
            await ticketChannel.permissionOverwrites.edit(adminRole.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                ManageMessages: true,
            });
        }
        
        ticketCache.activeTickets.set(user.id, {
            ticketNumber: ticketNumber,
            channelId: ticketChannel.id,
            guildId: guild.id,
            userId: user.id,
            userTag: user.tag,
            createdAt: Date.now(),
            reason: reason
        });
        
        const welcomeEmbed = new EmbedBuilder()
            .setColor(colors.primary)
            .setTitle(`🎫 Tiket #${ticketNumber}`)
            .setDescription(`Halo <@${user.id}>, terima kasih telah membuat tiket!`)
            .setThumbnail(embedImages.supportSystem)
            .addFields(
                { name: '📋 Permintaan', value: reason },
                { name: '👤 Dibuat oleh', value: user.tag, inline: true },
                { name: '📅 Tanggal', value: new Date().toLocaleString('id-ID'), inline: true }
            )
            .setFooter({ text: 'Admin akan segera merespons!' })
            .setTimestamp();
        
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Tutup Tiket')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await ticketChannel.send({
            embeds: [welcomeEmbed],
            components: [buttonRow]
        });
        
        await creatingMsg.edit(`✅ **Tiket berhasil dibuat!**\nChannel: <#${ticketChannel.id}>\nID: #${ticketNumber}`);
        
    } catch (error) {
        console.error('Error creating ticket from command:', error);
        await creatingMsg.edit('❌ Gagal membuat tiket!');
    }
}

async function closeTicketCommand(message, args) {
    if (!isAdmin(message.member)) {
        return sendTempMessage(message.channel, '❌ Hanya admin yang dapat menutup tiket!', 5000);
    }
    
    const ticket = Array.from(ticketCache.activeTickets.values()).find(t => 
        t.channelId === message.channel.id
    );
    
    if (!ticket) {
        return sendTempMessage(message.channel, '❌ Ini bukan channel tiket!', 5000);
    }
    
    const closeReason = args.join(' ') || 'Tidak ada alasan diberikan';
    
    await sendTempMessage(message.channel, `⏳ **Menutup tiket #${ticket.ticketNumber}...**`, 3000);
    
    const ticketEntry = Array.from(ticketCache.activeTickets.entries()).find(([_, t]) => 
        t.channelId === message.channel.id
    );
    
    if (ticketEntry) {
        ticketCache.activeTickets.delete(ticketEntry[0]);
    }
    
    const closeEmbed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle('🎫 Tiket Ditutup')
        .setDescription(`**Tiket #${ticket.ticketNumber}** telah ditutup`)
        .setThumbnail(embedImages.ticketClosed)
        .addFields(
            { name: '🔒 Ditutup oleh', value: message.author.tag, inline: true },
            { name: '👤 Pembuat', value: ticket.userTag, inline: true },
            { name: '📝 Alasan', value: closeReason }
        )
        .setFooter({ text: `ID: #${ticket.ticketNumber}` })
        .setTimestamp();
    
    await message.channel.send({ embeds: [closeEmbed] });
    
    await message.channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: false,
        AddReactions: false
    });
    
    await message.channel.setName(`closed-${ticket.ticketNumber}`.toLowerCase().slice(0, 100));
    
    await sendCloseLog(ticket, message.author, closeReason);
    
    setTimeout(async () => {
        try {
            if (message.channel.deletable) {
                await message.channel.delete('Tiket ditutup - Auto delete');
            }
        } catch (error) {
            console.error('Error deleting channel:', error);
        }
    }, 10000);
}

async function addUserToTicket(message, args) {
    if (!isAdmin(message.member)) {
        return sendTempMessage(message.channel, '❌ Hanya admin yang dapat menambahkan user ke tiket!', 5000);
    }
    
    const userToAdd = message.mentions.users.first();
    if (!userToAdd) {
        return sendTempMessage(message.channel, '❌ Tag user yang ingin ditambahkan!', 5000);
    }
    
    try {
        await message.channel.permissionOverwrites.edit(userToAdd.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
        });
        
        await message.channel.send(`✅ <@${userToAdd.id}> telah ditambahkan ke tiket!`);
    } catch (error) {
        console.error('Error adding user:', error);
        await message.channel.send('❌ Gagal menambahkan user!');
    }
}

async function removeUserFromTicket(message, args) {
    if (!isAdmin(message.member)) {
        return sendTempMessage(message.channel, '❌ Hanya admin yang dapat menghapus user dari tiket!', 5000);
    }
    
    const userToRemove = message.mentions.users.first();
    if (!userToRemove) {
        return sendTempMessage(message.channel, '❌ Tag user yang ingin dihapus!', 5000);
    }
    
    try {
        await message.channel.permissionOverwrites.delete(userToRemove.id);
        await message.channel.send(`✅ <@${userToRemove.id}> telah dihapus dari tiket!`);
    } catch (error) {
        console.error('Error removing user:', error);
        await message.channel.send('❌ Gagal menghapus user!');
    }
}

async function renameTicket(message, args) {
    if (!isAdmin(message.member)) {
        return sendTempMessage(message.channel, '❌ Hanya admin yang dapat mengganti nama tiket!', 5000);
    }
    
    const newName = args.join(' ');
    if (!newName || newName.length < 3) {
        return sendTempMessage(message.channel, '❌ Masukkan nama baru untuk tiket (minimal 3 karakter)!', 5000);
    }
    
    try {
        const oldName = message.channel.name;
        const cleanName = newName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
        await message.channel.setName(cleanName);
        await message.channel.send(`✅ Nama tiket diubah dari \`${oldName}\` menjadi \`${cleanName}\``);
    } catch (error) {
        console.error('Error renaming ticket:', error);
        await message.channel.send('❌ Gagal mengganti nama tiket!');
    }
}

async function showTicketLogs(message) {
    if (!isAdmin(message.member)) {
        return sendTempMessage(message.channel, '❌ Hanya admin yang dapat melihat log tiket!', 5000);
    }
    
    const logChannel = message.guild.channels.cache.find(c => 
        c.name === ticketConfig.logChannel && c.type === ChannelType.GuildText
    );
    
    if (!logChannel) {
        return message.channel.send('❌ Log channel tidak ditemukan!');
    }
    
    try {
        const messages = await logChannel.messages.fetch({ limit: 10 });
        const logEmbeds = messages.filter(msg => msg.embeds.length > 0).map(msg => msg.embeds[0]);
        
        if (logEmbeds.length === 0) {
            return message.channel.send('ℹ️ Belum ada log tiket yang ditutup.');
        }
        
        const logEmbed = new EmbedBuilder()
            .setColor(colors.info)
            .setTitle('📋 Log Tiket Terbaru')
            .setDescription(`Menampilkan ${logEmbeds.length} log terbaru`)
            .setThumbnail(embedImages.ticketLogs)
            .setFooter({ text: `Log dari #${logChannel.name}` })
            .setTimestamp();
        
        await message.channel.send({ embeds: [logEmbed] });
        
    } catch (error) {
        console.error('Error showing logs:', error);
        await message.channel.send('❌ Gagal mengambil log tiket!');
    }
}

async function cleanupTickets(message) {
    if (!isAdmin(message.member)) {
        return sendTempMessage(message.channel, '❌ Hanya admin yang dapat menggunakan perintah ini!', 5000);
    }
    
    let cleaned = 0;
    const channels = message.guild.channels.cache.filter(ch => 
        ch.name.startsWith('closed-') && ch.type === ChannelType.GuildText
    );
    
    for (const channel of channels.values()) {
        try {
            await channel.delete('Cleanup - old closed ticket');
            cleaned++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay untuk mencegah rate limit
        } catch (error) {
            console.error(`Error cleaning channel ${channel.name}:`, error);
        }
    }
    
    await message.channel.send(`✅ Cleanup selesai. ${cleaned} channel dihapus.`);
}

async function showHelp(message) {
    const isAdminUser = isAdmin(message.member);
    
    const embed = new EmbedBuilder()
        .setColor(colors.primary)
        .setTitle('🎫 Bantuan Sistem Tiket')
        .setDescription('Sistem tiket dengan tombol dan log otomatis')
        .setThumbnail(embedImages.supportSystem)
        .addFields(
            { 
                name: '**Perintah Umum**', 
                value: '```' +
                       '!ticket [alasan] - Buat tiket baru\n' +
                       '!help            - Tampilkan bantuan\n' +
                       '!ping            - Cek status bot' +
                       '```' 
            }
        );
    
    if (isAdminUser) {
        embed.addFields(
            { 
                name: '**Perintah Admin**', 
                value: '```' +
                       '!setup              - Setup panel tiket\n' +
                       '!close [alasan]     - Tutup tiket (perintah)\n' +
                       '!add @user          - Tambah user ke tiket\n' +
                       '!remove @user       - Hapus user dari tiket\n' +
                       '!rename [nama]      - Ganti nama tiket\n' +
                       '!logs               - Lihat log tiket ditutup\n' +
                       '!cleanup            - Hapus channel lama' +
                       '```' 
            }
        );
    }
    
    embed.addFields(
        { name: '📋 Setup', value: '1. Gunakan `!setup` di channel\n2. Panel dengan tombol akan muncul\n3. User klik tombol untuk buat tiket' },
        { name: '⚙️ Catatan', value: '• Hanya admin yang bisa tutup tiket\n• Channel dihapus 10 detik setelah ditutup\n• Log hanya untuk tiket yang ditutup' }
    )
    .setFooter({ text: `Status: ${isAdminUser ? 'Admin ✅' : 'User'}` })
    .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
}

// ============================================
// ERROR HANDLING & STARTUP
// ============================================

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    
    // Clear rate limit intervals
    if (rateLimiter.cleanupInterval) {
        clearInterval(rateLimiter.cleanupInterval);
    }
    
    // Destroy client
    if (client.destroy) {
        client.destroy();
    }
    
    // Close server
    server.close(() => {
        console.log('✅ Shutdown complete');
        process.exit(0);
    });
});

// Get token from environment variable
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('ERROR: Bot token tidak ditemukan!');
    console.log('='.repeat(50));
    console.log('CARA MENGGUNAKAN:');
    console.log('1. Set environment variable DISCORD_TOKEN di Render');
    console.log('2. Atau buat file .env dengan DISCORD_TOKEN=token_anda');
    console.log('='.repeat(50));
    
    console.log('⚠️  Discord bot tidak akan berjalan, tapi Express server tetap aktif');
} else {
    // Login ke Discord dengan error handling
    client.login(token).catch(error => {
        console.error('Gagal login ke Discord:', error);
        console.log('⚠️  Discord bot gagal connect, tapi Express server tetap aktif');
    });
}