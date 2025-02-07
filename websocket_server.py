import asyncio
import websockets
import json

connected_clients = set()

async def handler(websocket, path):
    
    """Handles WebSocket connections and messages."""
    print(f"Client connected: {websocket.remote_address}")
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            print("Received:", data)
            await broadcast(json.dumps(data))
    except websockets.exceptions.ConnectionClosed:
        print(f"Client disconnected: {websocket.remote_address}")
    finally:
        connected_clients.remove(websocket)

async def broadcast(message):
    """Send a message to all connected clients."""
    if connected_clients:
        await asyncio.wait([client.send(message) for client in connected_clients])

async def start_server():
    """Start WebSocket server and keep it alive."""
    server = await websockets.serve(handler, "0.0.0.0", 8765)
    print("WebSocket server running on ws://0.0.0.0:8765")
    try:
        await asyncio.Future()  # Keeps the server running
    except asyncio.CancelledError:
        print("Server shutting down gracefully...")


if __name__ == "__main__":
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        print("Server stopped by user.")
