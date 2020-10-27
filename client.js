module.exports = function(RED) {
    'use strict';
    let io = require("socket.io-client");
    let sockets = []
    function SocketIOConfig(n) {
        RED.nodes.createNode(this, n);
        this.host = n.host;
    }
    RED.nodes.registerType('socket-megacam-config', SocketIOConfig);

    function SocketIOConnector(n){
        RED.nodes.createNode(this, n);
        this.server = RED.nodes.getNode(n.server);
        this.name = n.name;
        var node = this;
        sockets[node.id] = io.connect(this.server.host, {transports: ['websocket']})
        sockets[node.id].on('connect', function(){
            node.send({ payload:{socketId:node.id, status:'connected'} });
            node.status({fill:"green",shape:"dot", text:"connected"});
        });
        sockets[node.id].on('disconnect', function(){
            node.send({payload:{socketId:node.id, status:'disconnected'}});
            node.status({fill:'red',shape:'ring', text:'disconnected'});
        });
        sockets[node.id].on('connect_error', function(err) {
            if (err) {
                node.status({fill:'red',shape:'ring',text:'disconnected'});
                node.send({payload:{socketId:node.id, status:'disconnected'}});
            }
        });
        this.on('close', function(done) {
            sockets[node.id].disconnect();
            node.status({});
            done();
        });
    }
    RED.nodes.registerType('socketio-megacam-connector', SocketIOConnector);

    function SocketIOListener(n){
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.eventName = n.eventname;
        this.socketId = null;

        var node = this;
        node.on('input', function(msg){
            node.socketId = msg.payload.socketId;
            sockets[node.socketId].removeAllListeners(node.eventName);
            if(msg.payload.status == 'connected'){
                node.status({fill:'green',shape:'dot',text:'listening'});
                sockets[node.socketId].on(node.eventName, msg.message, function(err,data){
                    node.send( {payload:{err} || {data}} );
                });
            }else{
                node.status({fill:'red',shape:'ring',text:'disconnected'});
            }
        });

        node.on('close', function(done) {
            sockets[node.socketId].removeAllListeners(node.eventName);
            node.status({});
            done();
        });
    }
    RED.nodes.registerType('socketio-megacam-listener', SocketIOListener);

    function SocketIOEmitter(n){
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.eventName = n.eventname;
        this.socketId = null;

        var node = this;
        node.on('input', function(msg){
            node.socketId = msg.payload.socketId;
            if(msg.payload.status == 'connected'){
                node.status({fill:'green',shape:'dot',text:'emitting'});
                sockets[node.socketId].emit(node.eventName, msg.message, function(err,data){
                    node.send( {payload:{err} || {data}} );
                });
            }else{
                node.status({fill:'red',shape:'ring',text:'disconnected'});
            }
        });
    }
    RED.nodes.registerType('socketio-megacam-emitter', SocketIOEmitter);
}