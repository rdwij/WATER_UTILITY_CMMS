-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jul 13, 2026 at 01:47 AM
-- Server version: 9.7.1
-- PHP Version: 8.4.20

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mycmms`
--

-- --------------------------------------------------------

--
-- Table structure for table `asset_locations`
--

CREATE TABLE `asset_locations` (
  `id` bigint UNSIGNED NOT NULL,
  `_lft` int UNSIGNED NOT NULL DEFAULT '0',
  `_rgt` int UNSIGNED NOT NULL DEFAULT '0',
  `parent_id` int UNSIGNED DEFAULT NULL,
  `cost_center_id` bigint NOT NULL,
  `asset_location_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `asset_locations`
--

INSERT INTO `asset_locations` (`id`, `_lft`, `_rgt`, `parent_id`, `cost_center_id`, `asset_location_name`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 38, NULL, 11000, 'RSC - Western Production', '2021-12-17 05:23:28', '2021-12-17 05:23:28', NULL),
(4, 39, 40, NULL, 2000, 'RSC - Western South', '2021-12-17 18:29:16', '2021-12-17 18:29:16', NULL),
(5, 41, 42, NULL, 1000, 'RSC - Western Central', '2021-12-17 18:30:55', '2021-12-17 18:30:55', NULL),
(6, 43, 44, NULL, 3000, 'RSC - Southern', '2021-12-17 18:32:38', '2021-12-17 18:32:38', NULL),
(7, 45, 58, NULL, 4000, 'RSC - Central', '2021-12-17 18:33:22', '2021-12-17 18:33:22', NULL),
(8, 59, 60, NULL, 5000, 'RSC - East', '2021-12-17 18:34:14', '2021-12-17 18:34:14', NULL),
(9, 61, 134, NULL, 7000, 'RSC - North Central', '2021-12-17 18:35:01', '2021-12-17 18:35:01', NULL),
(10, 135, 194, NULL, 9000, 'RSC - North West', '2021-12-17 18:36:32', '2021-12-17 18:36:32', NULL),
(11, 195, 196, NULL, 10000, 'RSC - Sabaragamuwa', '2021-12-17 18:37:14', '2021-12-17 18:37:14', NULL),
(12, 197, 198, NULL, 12000, 'RSC - Western North', '2021-12-17 18:38:35', '2021-12-17 18:38:35', NULL),
(13, 199, 200, NULL, 13000, 'RSC - Nothern', '2021-12-17 18:39:06', '2021-12-17 18:39:06', NULL),
(14, 201, 202, NULL, 14000, 'RSC - Uva', '2021-12-17 18:39:54', '2021-12-17 18:39:54', NULL),
(15, 8, 11, 1, 11108, 'Manager - Kandana WTP', '2021-12-17 18:42:14', '2021-12-17 18:42:14', NULL),
(16, 12, 13, 1, 11105, 'Kalatuwawa WTP', '2021-12-17 18:43:39', '2021-12-17 18:43:39', NULL),
(17, 14, 15, 1, 11106, 'Labugama WTP', '2021-12-17 18:44:33', '2021-12-17 18:44:34', NULL),
(20, 16, 17, 1, 11113, 'Workshop - Ambathale', '2021-12-19 02:20:07', '2021-12-19 02:20:08', NULL),
(21, 18, 23, 1, 11117, 'Manager - Biyagama WTP', '2021-12-19 02:24:29', '2021-12-19 02:24:29', NULL),
(22, 19, 20, 21, 11118, 'Bambukuliya WTP', '2021-12-19 02:25:06', '2021-12-19 02:25:07', NULL),
(24, 136, 175, 10, 9200, 'Manager - Kurunegala', '2021-12-23 03:18:58', '2021-12-23 03:18:59', NULL),
(25, 137, 138, 24, 9208, 'Giriulla WTP', '2021-12-23 03:23:16', '2021-12-23 03:23:17', NULL),
(26, 139, 140, 24, 9216, 'Pannala WTP', '2021-12-23 03:23:58', '2021-12-23 03:23:58', NULL),
(27, 141, 142, 24, 9224, 'Wariyapola WTP', '2021-12-23 03:24:51', '2021-12-23 03:24:51', NULL),
(28, 143, 144, 24, 9210, 'Hettipola WTP', '2021-12-23 03:25:23', '2021-12-23 03:25:24', NULL),
(29, 9, 10, 15, 11116, 'Kethhena WTP', '2021-12-23 03:31:44', '2021-12-23 03:31:44', NULL),
(30, 145, 146, 24, 9217, 'Polgahawela', '2021-12-23 03:32:25', '2021-12-23 03:32:25', NULL),
(32, 149, 150, 24, 9201, 'Alawwa WTP', '2021-12-23 03:35:13', '2021-12-23 03:35:13', NULL),
(33, 151, 152, 24, 9207, 'Galgamuwa WTP', '2021-12-23 03:36:30', '2021-12-23 03:36:31', NULL),
(34, 153, 154, 24, 9202, 'Ambanpola WTP', '2021-12-23 03:37:36', '2021-12-23 03:37:36', NULL),
(35, 155, 156, 24, 9206, 'Dodangaslanda WTP', '2021-12-23 03:38:26', '2021-12-23 03:38:27', NULL),
(36, 157, 158, 24, 9214, 'Ogodapola WTP', '2021-12-23 03:39:07', '2021-12-23 03:39:08', NULL),
(37, 159, 160, 24, 9219, 'Rambodagalla WTP', '2021-12-23 03:39:51', '2021-12-23 03:39:51', NULL),
(38, 161, 162, 24, 9227, 'Mawathagama WTP', '2021-12-23 03:40:50', '2021-12-23 03:40:51', NULL),
(39, 163, 164, 24, 9213, 'Nikaweratiya WTP', '2021-12-23 03:41:56', '2021-12-23 03:41:56', NULL),
(40, 165, 166, 24, 9211, 'Kurunegala WTP', '2021-12-23 03:42:35', '2021-12-23 03:42:35', NULL),
(41, 167, 168, 24, 9221, 'Sewerage TP', '2021-12-23 03:43:25', '2021-12-23 03:43:26', NULL),
(42, 24, 25, 1, 11102, 'Ambathale - Main Plant', '2022-10-19 07:55:25', '2022-10-19 07:55:25', NULL),
(43, 26, 27, 1, 11101, 'Ambathale - New Plant', '2022-10-19 07:56:54', '2022-10-19 07:56:54', NULL),
(44, 28, 29, 1, 11104, 'Ambathale - CTM', '2022-10-19 07:58:15', '2022-10-19 07:58:15', NULL),
(45, 30, 31, 1, 11112, 'Ambathale - Laboratory', '2022-10-19 07:58:57', '2022-10-19 07:58:57', NULL),
(46, 32, 33, 1, 11115, 'CHICO WTP', '2022-10-19 07:59:30', '2022-10-19 07:59:30', NULL),
(47, 34, 35, 1, 11103, 'Epitamulla - Booster PH', '2022-10-19 08:00:17', '2022-10-19 08:00:17', NULL),
(48, 36, 37, 1, 11114, 'Ambathale - Premises', '2022-10-19 08:01:06', '2022-10-19 08:01:06', NULL),
(49, 46, 57, 7, 4300, 'Kandy North Region', '2022-10-20 10:53:20', '2022-10-20 10:53:20', NULL),
(50, 47, 48, 49, 4302, 'Matale WTP', '2022-10-20 10:54:04', '2022-10-20 10:54:04', NULL),
(51, 49, 50, 49, 4308, 'Dambulla WTP', '2022-10-20 10:54:35', '2022-10-20 10:54:35', NULL),
(52, 51, 52, 49, 4346, 'Udatenna WTP', '2022-10-20 10:55:26', '2022-10-20 10:55:26', NULL),
(53, 53, 54, 49, 4366, 'Rattota WTP', '2022-10-20 10:55:54', '2022-10-20 10:55:55', NULL),
(54, 55, 56, 49, 4365, 'Ambanganga WTP', '2022-10-20 10:56:25', '2022-10-20 10:56:25', NULL),
(55, 169, 170, 24, 9239, 'Gokarella WSS', '2022-11-16 23:19:43', '2022-11-16 23:19:43', NULL),
(56, 171, 172, 24, 9240, 'Deduru Oya WTP', '2022-11-16 23:20:47', '2022-11-16 23:20:48', NULL),
(57, 173, 174, 24, 9233, 'Narammala WSS', '2022-11-16 23:21:28', '2022-11-16 23:21:29', NULL),
(58, 176, 189, 10, 9100, 'Manager - Puttalam', '2022-11-16 23:23:51', '2022-11-16 23:23:51', NULL),
(59, 177, 178, 58, 9101, 'Anamaduwa WSS', '2022-11-16 23:24:29', '2022-11-16 23:24:30', NULL),
(60, 179, 180, 58, 9104, 'Eluwankulama WTP', '2022-11-16 23:26:14', '2022-11-16 23:26:15', NULL),
(61, 181, 182, 58, 9102, 'Dankotuwa WTP', '2022-11-16 23:26:55', '2022-11-16 23:26:55', NULL),
(62, 183, 184, 58, 9103, 'Nattandiya WSS', '2022-11-16 23:27:36', '2022-11-16 23:27:36', NULL),
(63, 185, 186, 58, 9106, 'Kakapalliya WTP', '2022-11-16 23:28:34', '2022-11-16 23:28:34', NULL),
(64, 187, 188, 58, 9105, 'Bingiriya WTP', '2022-11-16 23:29:30', '2022-11-16 23:29:31', NULL),
(65, 190, 191, 10, 9002, 'Manager - Water Reclamation', '2022-11-19 04:01:14', '2022-11-19 04:01:15', NULL),
(66, 192, 193, 10, 9001, 'Manager - Ground Water', '2022-11-19 04:02:18', '2022-11-19 04:02:18', NULL),
(67, 62, 107, 9, 7100, 'Manager - Anuradhapura', '2023-01-18 08:27:07', '2023-01-18 08:27:08', NULL),
(68, 63, 64, 67, 7101, 'New Town WTP', '2023-01-18 08:27:54', '2023-01-18 08:27:54', NULL),
(69, 65, 66, 67, 7105, 'Habarana WSS', '2023-01-18 08:28:52', '2023-01-18 08:28:53', NULL),
(70, 67, 68, 67, 7108, 'Kahatagasdigiliya WSS', '2023-01-18 08:29:27', '2023-01-18 08:29:27', NULL),
(71, 69, 70, 67, 7109, 'Kebithigollewa WSS', '2023-01-18 08:29:59', '2023-01-18 08:30:00', NULL),
(72, 71, 72, 67, 7110, 'Kekirawa WSS', '2023-01-18 08:32:22', '2023-01-18 08:32:22', NULL),
(73, 73, 74, 67, 7112, 'Medawachhiya WSS', '2023-01-18 08:32:49', '2023-01-18 08:32:50', NULL),
(74, 75, 76, 67, 7113, 'Kalawewa WTP', '2023-01-18 08:33:23', '2023-01-18 08:33:23', NULL),
(75, 77, 78, 67, 7114, 'Mihinthale WSS', '2023-01-18 08:34:02', '2023-01-18 08:34:03', NULL),
(76, 79, 80, 67, 7115, 'Padaviya WSS', '2023-01-18 08:34:32', '2023-01-18 08:34:33', NULL),
(77, 81, 82, 67, 7118, 'Secred City WTP', '2023-01-18 08:35:08', '2023-01-18 08:35:08', NULL),
(78, 83, 84, 67, 7119, 'Thambutthegama WSS', '2023-01-18 08:35:42', '2023-01-18 08:35:43', NULL),
(79, 85, 86, 67, 7122, 'WorkShop Anuradhapura', '2023-01-18 08:36:19', '2023-01-18 08:36:20', NULL),
(80, 87, 88, 67, 7125, 'Galnewa WSS', '2023-01-18 08:36:45', '2023-01-18 08:36:45', NULL),
(81, 89, 90, 67, 7127, 'Thuruwila WTP', '2023-01-18 08:37:15', '2023-01-18 08:37:15', NULL),
(82, 91, 92, 67, 7128, 'Thalawa WSS', '2023-01-18 08:37:40', '2023-01-18 08:37:40', NULL),
(83, 93, 94, 67, 7129, 'Jaffna Junction WSS', '2023-01-18 08:38:06', '2023-01-18 08:38:07', NULL),
(84, 95, 96, 67, 7130, 'Wijepura WSS', '2023-01-18 08:38:37', '2023-01-18 08:38:38', NULL),
(85, 97, 98, 67, 7133, 'Nachchaduwa WSS', '2023-01-18 08:39:06', '2023-01-18 08:39:06', NULL),
(86, 99, 100, 67, 7141, 'Oyamaduwa WSS', '2023-01-18 08:39:37', '2023-01-18 08:39:37', NULL),
(87, 101, 102, 67, 7145, 'Mahakanadarawa WTP', '2023-01-18 08:40:11', '2023-01-18 08:40:11', NULL),
(88, 103, 104, 67, 7146, 'Rambewa WSS', '2023-01-18 08:42:48', '2023-01-18 08:42:48', NULL),
(89, 108, 133, 9, 7200, 'Manager - Polonnaruwa', '2023-01-18 08:44:04', '2023-01-18 08:44:05', NULL),
(90, 109, 110, 89, 7202, 'Workshop Polonnaruwa', '2023-01-18 08:45:01', '2023-01-18 08:45:01', NULL),
(91, 111, 112, 89, 7203, 'Polonnaruwa WSS', '2023-01-18 08:45:35', '2023-01-18 08:45:35', NULL),
(92, 113, 114, 89, 7204, 'Hingurakgoda WSS', '2023-01-18 09:08:31', '2023-01-18 09:08:32', NULL),
(93, 115, 116, 89, 7205, 'Minneriya WSS', '2023-01-18 09:09:31', '2023-01-18 09:09:31', NULL),
(94, 117, 118, 89, 7206, 'Gallela WTP', '2023-01-18 09:09:59', '2023-01-18 09:10:00', NULL),
(95, 119, 120, 89, 7207, 'Gallella WSS', '2023-01-18 09:10:57', '2023-01-18 09:10:57', NULL),
(96, 121, 122, 89, 7208, 'Sewagama', '2023-01-18 09:11:21', '2023-01-18 09:11:21', NULL),
(97, 123, 124, 89, 7209, 'Bendiwewa', '2023-01-18 09:11:51', '2023-01-18 09:11:52', NULL),
(98, 125, 126, 89, 7210, 'Dalukana WSS', '2023-01-18 09:12:14', '2023-01-18 09:12:15', NULL),
(99, 127, 128, 89, 7211, 'Medirigiriya WSS', '2023-01-18 09:12:49', '2023-01-18 09:12:49', NULL),
(100, 129, 130, 89, 7214, 'Bakamoona WSS', '2023-01-18 09:13:14', '2023-01-18 09:13:14', NULL),
(101, 131, 132, 89, 7216, 'Aralaganwila WSS', '2023-01-18 09:14:57', '2023-01-18 09:14:57', NULL),
(102, 105, 106, 67, 7134, 'Nuwarawewa WTP', '2023-01-24 05:52:49', '2023-01-24 05:52:49', NULL),
(103, 21, 22, 21, 11119, 'Karasnagala WTP', '2024-03-08 12:32:51', '2024-03-08 12:32:51', NULL),
(104, 203, 210, NULL, 8000, 'RSC - GC WR', '2024-04-18 06:34:13', '2024-04-18 06:34:13', NULL),
(105, 204, 205, 104, 8120, 'Ja Ela/Ekala', '2024-04-18 06:35:24', '2024-04-18 06:35:24', NULL),
(106, 206, 207, 104, 8116, 'Mount Lavina/  Ratmalana', '2024-04-18 06:36:07', '2024-04-18 06:36:07', NULL),
(107, 208, 209, 104, 8106, 'Jayawadanagama', '2024-04-18 06:36:47', '2024-04-18 06:36:47', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `asset_locations`
--
ALTER TABLE `asset_locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asset_locations_cost_center_id_unique` (`cost_center_id`),
  ADD KEY `asset_locations__lft__rgt_parent_id_index` (`_lft`,`_rgt`,`parent_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `asset_locations`
--
ALTER TABLE `asset_locations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
