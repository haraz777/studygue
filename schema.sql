-- My study: skema database untuk Laragon (MySQL / MariaDB)
CREATE DATABASE IF NOT EXISTS studyhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studyhub;

CREATE TABLE IF NOT EXISTS classes (
  id        VARCHAR(40) PRIMARY KEY,
  nama      VARCHAR(150) NOT NULL,
  hari      TINYINT NOT NULL,              -- 0=Minggu ... 6=Sabtu
  mulai     TIME NOT NULL,
  selesai   TIME NOT NULL,
  ruang     VARCHAR(500) NOT NULL DEFAULT '',  -- ruang atau link Zoom
  mode      ENUM('online','offline') NOT NULL DEFAULT 'online'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meetings (
  id        VARCHAR(40) PRIMARY KEY,
  class_id  VARCHAR(40) NOT NULL,
  no        INT NOT NULL,                  -- pertemuan ke-
  judul     VARCHAR(200) NOT NULL DEFAULT '',
  tgl       DATE NULL,
  zoom      VARCHAR(500) NOT NULL DEFAULT '',
  link      VARCHAR(500) NOT NULL DEFAULT '',
  note      TEXT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meeting_files (
  id          VARCHAR(40) PRIMARY KEY,
  meeting_id  VARCHAR(40) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(120) NOT NULL DEFAULT '',
  size        BIGINT NOT NULL DEFAULT 0,
  url         VARCHAR(300) NOT NULL,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id         VARCHAR(40) PRIMARY KEY,
  judul      VARCHAR(250) NOT NULL,
  mk         VARCHAR(150) NOT NULL DEFAULT '',
  pert       INT NULL,                     -- pertemuan ke- (opsional)
  deadline   DATETIME NOT NULL,            -- disimpan dalam UTC
  note       TEXT NULL,
  link       VARCHAR(500) NOT NULL DEFAULT '',
  done       TINYINT(1) NOT NULL DEFAULT 0,
  submitted  TINYINT(1) NOT NULL DEFAULT 0,
  file_name  VARCHAR(255) NULL,
  file_type  VARCHAR(120) NULL,
  file_size  BIGINT NULL,
  file_url   VARCHAR(300) NULL,
  INDEX (deadline)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS videos (
  id     VARCHAR(40) PRIMARY KEY,
  url    VARCHAR(500) NOT NULL,
  embed  VARCHAR(500) NOT NULL,
  judul  VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cards (          -- koleksi polaroid yang sudah dibuka
  id    VARCHAR(40) PRIMARY KEY,
  date  VARCHAR(10) NOT NULL,
  q     VARCHAR(300) NOT NULL,
  t     INT NOT NULL DEFAULT 0,
  ts    BIGINT NOT NULL,
  img   VARCHAR(300) NOT NULL DEFAULT ''   -- foto polaroid (dari folder polaroid/)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profile (        -- satu baris (id = 1)
  id INT PRIMARY KEY, nama VARCHAR(150) DEFAULT '', nim VARCHAR(50) DEFAULT '',
  kampus VARCHAR(200) DEFAULT '', ig VARCHAR(200) DEFAULT '', gh VARCHAR(300) DEFAULT '',
  email VARCHAR(200) DEFAULT '', bio TEXT NULL, foto VARCHAR(300) DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (       -- satu baris (id = 1)
  id INT PRIMARY KEY, goal INT NOT NULL DEFAULT 4,
  dur_f INT NOT NULL DEFAULT 25, dur_s INT NOT NULL DEFAULT 5, dur_l INT NOT NULL DEFAULT 15,
  pomo_date VARCHAR(10) NULL, pomo_count INT NOT NULL DEFAULT 0,
  pending TINYINT(1) NOT NULL DEFAULT 0, last_yt VARCHAR(40) NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO profile (id) VALUES (1);
INSERT IGNORE INTO settings (id) VALUES (1);
