-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 29-04-2026 a las 19:32:53
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `vivimostodos`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `prestamos_insumos`
--

CREATE TABLE `prestamos_insumos` (
  `id_prestamo` int(11) NOT NULL,
  `id_apartamento` int(11) NOT NULL,
  `id_reserva` int(11) NOT NULL,
  `id_inventario` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `fecha_prestamo` datetime NOT NULL,
  `fecha_espera` datetime NOT NULL,
  `nombre_insumo` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `prestamos_insumos`
--

INSERT INTO `prestamos_insumos` (`id_prestamo`, `id_apartamento`, `id_reserva`, `id_inventario`, `cantidad`, `fecha_prestamo`, `fecha_espera`, `nombre_insumo`) VALUES
(1, 206, 14, 7, 3, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'Hielera grande'),
(2, 206, 14, 7, 1, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'Hielera grande'),
(3, 206, 14, 8, 2, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'Parlante portátil'),
(4, 206, 14, 4, 5, '0000-00-00 00:00:00', '0000-00-00 00:00:00', 'Platos desechables (paquete)'),
(5, 206, 13, 9, 3, '2026-05-09 00:00:00', '2026-05-09 23:59:59', 'Extensión eléctrica');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `prestamos_insumos`
--
ALTER TABLE `prestamos_insumos`
  ADD PRIMARY KEY (`id_prestamo`),
  ADD KEY `fk_pi_apartamento` (`id_apartamento`),
  ADD KEY `fk_pi_reserva` (`id_reserva`),
  ADD KEY `fk_pi_inventario` (`id_inventario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `prestamos_insumos`
--
ALTER TABLE `prestamos_insumos`
  MODIFY `id_prestamo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `prestamos_insumos`
--
ALTER TABLE `prestamos_insumos`
  ADD CONSTRAINT `fk_pi_apartamento` FOREIGN KEY (`id_apartamento`) REFERENCES `usuarios` (`id_apartamento`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pi_inventario` FOREIGN KEY (`id_inventario`) REFERENCES `inventario` (`id_inventario`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pi_reserva` FOREIGN KEY (`id_reserva`) REFERENCES `reservas` (`id_reserva`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
