const Listener = require('jsraknet')
const Player = require('./player')
const BatchPacket = require('./protocol/mcbe/batch_packet')
const PacketRegistry = require('./protocol/packet_registry')

'use strict'

class Prismarine {

    /** @type {Listener} */
    #raknet 
    /** @type {Map<string, Player>} */
    #players = new Map()
    /** @type {PacketRegistry} */
    #packetRegistry = new PacketRegistry()

    listen() {
        this.#raknet = (new Listener).listen('0.0.0.0', 19132)

        // Client connected, instantiate player
        this.#raknet.on('openConnection', (connection) => {
            this.#players.set(connection.address.address, new Player(connection, connection.address))
        })

        // Get player from map by address, then handle packet
        this.#raknet.on('encapsulated', (packet, inetAddr) => {
            if (!this.#players.has(inetAddr.address)) return
            let player = this.#players.get(inetAddr.address)

            // Read batch content and handle them
            let pk = new BatchPacket()
            pk.buffer = packet.buffer
            pk.decode()

            // Read all packets inside batch and handle them
            for (let buf of pk.getPackets()) {
                console.log(buf)
                let packet = new (this.#packetRegistry.get(buf[0]))()  // Get packet from registry
                packet.buffer = buf
                packet.decode()
                player.handleDataPacket(packet)
            }
        })

        this.#raknet.on('closeConnection', (inetAddress, reason) => {
            console.log(`${inetAddress.address}:${inetAddress.port} disconnected due to ${reason}`)
        })
    }

}
module.exports = Prismarine