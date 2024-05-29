const axios = require("axios");
const express = require("express");
const app = express();
const fs = require("fs");
const { v4: uuid } = require("uuid");
app.use(express.json());
app.listen(3000, () => console.log("server On!"));

// 🟢
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// 🟢
app.post("/roommate", async (req, res) => {
    try {
        const { data } = await axios.get("https://randomuser.me/api");
        const roommate = data.results[0];
        const id = uuid().slice(30);
        const nombreRoommate = roommate.name.first + " " + roommate.name.last;
        const roommateData = { id: id, nombre: nombreRoommate, debe: 0, recibe: 0 };
        const roommateJSON = JSON.parse(fs.readFileSync("roommates.json", "utf8"));
        const roommates = roommateJSON.roommates;
        roommates.push(roommateData);
        fs.writeFileSync("roommates.json", JSON.stringify(roommateJSON));
        res.send("Roommate agregado");
    } catch (err) {
        res.status(500).send("Error al obtener los roommate");
    }
});

// 🟢
app.get("/roommates", (req, res) => {
    try {
        const roommateJSON = JSON.parse(fs.readFileSync("roommates.json", "utf8"));
        res.send(roommateJSON);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error al obtener los roommates");
    }
});

// 🟢
app.post("/gasto", (req, res) => {
    try {
        const { roommate, descripcion, monto } = req.body;

        // lee el archivo de gastos
        const gastoJSON = JSON.parse(fs.readFileSync("gastos.json", "utf8"));
        const nuevoGasto = {
            id: uuid().slice(30),
            roommate: roommate,
            descripcion: descripcion,
            monto: monto
        };

        // lista de roommates
        const roommateJSON = JSON.parse(fs.readFileSync("roommates.json", "utf8"));
        const countRoommate = roommateJSON.roommates.length;

        const debe = monto / countRoommate;
        const recibe = debe * (countRoommate - 1);

        for (let r = 0; r < roommateJSON.roommates.length; r++) {
            if (roommateJSON.roommates[r].nombre === roommate) {
                roommateJSON.roommates[r].recibe = (roommateJSON.roommates[r].recibe || 0) + recibe;
            } else {
                roommateJSON.roommates[r].debe = (roommateJSON.roommates[r].debe || 0) + debe;
            }
        }

        // agregamos el nuevo gasto al historial de gastos
        gastoJSON.gastos.push(nuevoGasto);
        fs.writeFileSync("gastos.json", JSON.stringify(gastoJSON), "utf8");

        // actualizamos el archivo roommates.json con los nuevos valores
        fs.writeFileSync("roommates.json", JSON.stringify(roommateJSON), "utf8");

        res.status(200).send("Gasto agregado con éxito");
    } catch (err) {
        console.log(err);
        res.status(500).send("Error al agregar el gasto");
    }
});

// 🟢
app.get("/gastos", (req, res) => {
    try {
        const gastosJSON = JSON.parse(fs.readFileSync("gastos.json", "utf8"));
        res.send(gastosJSON);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error al obtener los gastos");
    }
});

// 🟢
app.put("/gasto", (req, res) => {
    try {
        const { id, roommate, descripcion, monto } = req.body;

        // lee el archivo de gastos
        const gastosJSON = JSON.parse(fs.readFileSync("gastos.json", "utf8"));
        const gastoOriginal = gastosJSON.gastos.find((g) => g.id === id);

        if (!gastoOriginal) {
            return res.status(404).send("Gasto no encontrado");
        }

        // lista de roommates
        const roommateJSON = JSON.parse(fs.readFileSync("roommates.json", "utf8"));
        const countRoommate = roommateJSON.roommates.length;

        // calculamos los valores a restar del gasto original
        const debeOriginal = gastoOriginal.monto / countRoommate;
        const recibeOriginal = debeOriginal * (countRoommate - 1);

        // restamos los valores del gasto original
        for (let r = 0; r < roommateJSON.roommates.length; r++) {
            if (roommateJSON.roommates[r].nombre === gastoOriginal.roommate) {
                roommateJSON.roommates[r].recibe = (roommateJSON.roommates[r].recibe || 0) - recibeOriginal;
            } else {
                roommateJSON.roommates[r].debe = (roommateJSON.roommates[r].debe || 0) - debeOriginal;
            }
        }

        // calculamos los nuevos valores
        const debeNuevo = monto / countRoommate;
        const recibeNuevo = debeNuevo * (countRoommate - 1);

        // sumamos los nuevos valores
        for (let r = 0; r < roommateJSON.roommates.length; r++) {
            if (roommateJSON.roommates[r].nombre === roommate) {
                roommateJSON.roommates[r].recibe = (roommateJSON.roommates[r].recibe || 0) + recibeNuevo;
            } else {
                roommateJSON.roommates[r].debe = (roommateJSON.roommates[r].debe || 0) + debeNuevo;
            }
        }

        // actualizamos el gasto en el historial de gastos
        const editedGastos = gastosJSON.gastos.map((g) => g.id === id ? { id, roommate, descripcion, monto } : g);
        gastosJSON.gastos = editedGastos;

        fs.writeFileSync("gastos.json", JSON.stringify(gastosJSON), "utf8");

        // actualizamos el archivo roommates.json con los nuevos valores
        fs.writeFileSync("roommates.json", JSON.stringify(roommateJSON), "utf8");

        res.send("Gasto actualizado con éxito");
    } catch (err) {
        console.error("Error al actualizar el gasto:", err);
        res.status(500).send("Error al actualizar el gasto");
    }
});

// 🟢
app.delete("/gasto", (req, res) => {
    try {
        // extraemos el id
        const { id } = req.query;

        // leemos el archivo de gastos
        const gastosJSON = JSON.parse(fs.readFileSync("gastos.json", "utf8"));
        const gastos = gastosJSON.gastos;

        // encontramos el gasto a eliminar
        const gasto = gastos.find((g) => g.id === id);

        // leemos el archivo de roommates
        const roommateJSON = JSON.parse(fs.readFileSync("roommates.json", "utf8"));
        const countRoommate = roommateJSON.roommates.length;

        // calculamos los valores a restar
        const debe = gasto.monto / countRoommate;
        const recibe = debe * (countRoommate - 1);

        // actualizamos los valores de debe y recibe
        for (let r = 0; r < roommateJSON.roommates.length; r++) {
            if (roommateJSON.roommates[r].nombre === gasto.roommate) {
                roommateJSON.roommates[r].recibe = (roommateJSON.roommates[r].recibe || 0) - recibe;
            } else {
                roommateJSON.roommates[r].debe = (roommateJSON.roommates[r].debe || 0) - debe;
            }
        }

        // eliminamos el gasto del historial de gastos
        gastosJSON.gastos = gastos.filter((g) => g.id !== id);
        fs.writeFileSync("gastos.json", JSON.stringify(gastosJSON), "utf8");

        // actualizamos el archivo roommates.json con los nuevos valores
        fs.writeFileSync("roommates.json", JSON.stringify(roommateJSON), "utf8");

        res.send("Gasto eliminado con éxito");
    } catch (err) {
        console.error("Error al eliminar el gasto:", err);
        res.status(500).send("Error al eliminar el gasto");
    }
});
