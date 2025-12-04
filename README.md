# IoT Project

This project is structured into two main components, **Server** and **Edge**. Each component is managed via its own `docker-compose` file located in the `infra` folder.

## Prerequisites

- **Docker** and **Docker Compose** installed on your machine.

## Configuration

Before starting the services, verify the presence and configuration of the `.env` files.

- **Server**: `infra/server/.env`
- **Edge**: `infra/edge/.env`

---

## 1. Starting the Server

### Instructions

1. Open a terminal and navigate to the server folder:

   ```bash
   cd infra/server
   ```

2. Start the containers in the background:

   ```bash
   docker-compose up -d --build
   ```

3. Configure Node-RED flows:

   - Access `http://localhost:1880`
   - Go to the menu → **Import**
   - Select the file: `code/nodered-server/flows.json`
   - Click **Import** and then **Deploy**

4. Pull the required AI models into Ollama:

   ```bash
   docker exec -it iot-edge-ollama ollama pull qwen3:0.6b
   ```

5. Set InfluxDB Token:
Manually set the token via the InfluxDB web interface (`http://localhost:8086`) or via CLI, ensuring it matches the one configured in the `.env` file or in the services that use it.

6. Set Email Credentials: 
Manually set the credential for the email server in the Node-RED workflow.

---

## 2. Starting the Edge

### Instructions

1. Open a terminal and navigate to the edge folder:

   ```bash
   cd infra/edge
   ```

2. Start the containers in the background:

   ```bash
   docker-compose up -d --build
   ```

3. Pull the required AI models into Ollama:

   ```bash
   docker exec -it iot-edge-ollama ollama pull qwen3:0.30b
   docker exec -it iot-edge-ollama ollama pull qwen2.5:3b
   docker exec -it iot-edge-ollama ollama pull nomic-embed-text:v1.5
   ```

4. Configure Node-RED flows:
   - Access `http://localhost:1881`
   - Go to the menu → **Import**
   - Select the file: `code/nodered-edge/flows.json`
   - Click **Import** and then **Deploy**
