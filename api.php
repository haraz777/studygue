<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');
function fail($m, $c = 500) { http_response_code($c); echo json_encode(['error' => $m], JSON_UNESCAPED_UNICODE); exit; }
if ($ONLY_LOCALHOST && !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) fail('Akses ditolak', 403);

function iso($v) { return $v ? gmdate('Y-m-d\TH:i:s\Z', strtotime($v . ' UTC')) : ''; }
function chk($id) { if (!is_string($id) || !preg_match('/^[\w-]{1,40}$/', $id)) fail('ID tidak valid', 400); }
function col($p, $sql, $a = []) { $s = $p->prepare($sql); $s->execute($a); return $s->fetchAll(PDO::FETCH_COLUMN); }
function rmfile($url) { if (!$url) return; $f = __DIR__ . '/uploads/' . basename($url); if (is_file($f)) @unlink($f); }
function upsert($p, $tbl, $d) {
    $c = array_keys($d);
    $up = implode(',', array_map(fn($k) => "`$k`=VALUES(`$k`)", array_filter($c, fn($k) => $k !== 'id')));
    $sql = "INSERT INTO `$tbl` (`" . implode('`,`', $c) . "`) VALUES (" . implode(',', array_fill(0, count($c), '?')) . ") ON DUPLICATE KEY UPDATE $up";
    $p->prepare($sql)->execute(array_values($d));
}

function loadAll($p) {
    $o = [];
    foreach ($p->query('SELECT * FROM tasks') as $r) {
        $o[] = ['_t' => 'task', 'id' => $r['id'], 'judul' => $r['judul'], 'mk' => $r['mk'], 'pert' => $r['pert'] === null ? '' : (string)$r['pert'],
            'deadline' => iso($r['deadline']), 'note' => (string)$r['note'], 'link' => $r['link'], 'done' => (bool)$r['done'], 'submitted' => (bool)$r['submitted'],
            'file' => $r['file_url'] ? ['name' => $r['file_name'], 'type' => $r['file_type'], 'size' => (int)$r['file_size'], 'url' => $r['file_url']] : null];
    }
    foreach ($p->query('SELECT * FROM classes') as $r) {
        $o[] = ['_t' => 'class', 'id' => $r['id'], 'nama' => $r['nama'], 'hari' => (int)$r['hari'], 'mulai' => substr($r['mulai'], 0, 5), 'selesai' => substr($r['selesai'], 0, 5), 'ruang' => $r['ruang'], 'mode' => $r['mode']];
    }
    $files = [];
    foreach ($p->query('SELECT * FROM meeting_files') as $r) {
        $files[$r['meeting_id']][] = ['name' => $r['name'], 'type' => $r['type'], 'size' => (int)$r['size'], 'url' => $r['url']];
    }
    foreach ($p->query('SELECT * FROM meetings') as $r) {
        $o[] = ['_t' => 'meeting', 'id' => $r['id'], 'classId' => $r['class_id'], 'no' => (int)$r['no'], 'judul' => $r['judul'], 'tgl' => $r['tgl'] ?: '',
            'zoom' => $r['zoom'], 'link' => $r['link'], 'note' => (string)$r['note'], 'files' => $files[$r['id']] ?? []];
    }
    foreach ($p->query('SELECT * FROM class_overrides') as $r) {
        $o[] = ['_t' => 'override', 'id' => $r['id'], 'classId' => $r['class_id'], 'tgl' => $r['tgl'], 'mode' => $r['mode'], 'ruang' => $r['ruang'],
            'mulai' => $r['mulai'] ? substr($r['mulai'], 0, 5) : '', 'selesai' => $r['selesai'] ? substr($r['selesai'], 0, 5) : '', 'batal' => (bool)$r['batal'], 'note' => $r['note']];
    }
    foreach ($p->query('SELECT * FROM videos') as $r) $o[] = ['_t' => 'video', 'id' => $r['id'], 'url' => $r['url'], 'embed' => $r['embed'], 'judul' => $r['judul']];
    foreach ($p->query('SELECT * FROM cards') as $r) $o[] = ['_t' => 'card', 'id' => $r['id'], 'date' => $r['date'], 'q' => $r['q'], 't' => (int)$r['t'], 'ts' => (int)$r['ts'], 'img' => (string)$r['img']];
    if ($r = $p->query('SELECT * FROM profile WHERE id=1')->fetch()) {
        $o[] = ['_t' => 'profile', 'id' => 'profile', 'Nama' => $r['nama'], 'Nim' => $r['nim'], 'Kampus' => $r['kampus'], 'Ig' => $r['ig'], 'Gh' => $r['gh'], 'Email' => $r['email'], 'Bio' => (string)$r['bio'], 'foto' => $r['foto']];
    }
    if ($r = $p->query('SELECT * FROM settings WHERE id=1')->fetch()) {
        $o[] = ['_t' => 'settings', 'id' => 'settings', 'goal' => (int)$r['goal'], 'dur' => ['f' => (int)$r['dur_f'], 's' => (int)$r['dur_s'], 'l' => (int)$r['dur_l']],
            'pomo' => ['date' => (string)$r['pomo_date'], 'count' => (int)$r['pomo_count']], 'pending' => (bool)$r['pending'], 'lastYt' => (string)$r['last_yt'], 'sso' => ''];
    }
    return $o;
}

try {
    $p = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    if (!$p->query("SHOW COLUMNS FROM cards LIKE 'img'")->fetch()) $p->exec("ALTER TABLE cards ADD COLUMN img VARCHAR(300) NOT NULL DEFAULT ''");
    $p->exec("CREATE TABLE IF NOT EXISTS class_overrides (id VARCHAR(40) PRIMARY KEY, class_id VARCHAR(40) NOT NULL, tgl DATE NOT NULL, mode ENUM('online','offline') NOT NULL DEFAULT 'online', ruang VARCHAR(500) NOT NULL DEFAULT '', mulai TIME NULL, selesai TIME NULL, batal TINYINT(1) NOT NULL DEFAULT 0, note VARCHAR(300) NOT NULL DEFAULT '', UNIQUE KEY uq_cls_tgl (class_id, tgl), FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE) ENGINE=InnoDB");
    $a = $_GET['action'] ?? 'all';
    $b = json_decode(file_get_contents('php://input'), true) ?: [];

    if ($a === 'polaroids') {
        $o = [];
        foreach (glob(__DIR__ . '/polaroid/*') ?: [] as $f) if (preg_match('/\.(jpe?g|png|webp|gif)$/i', $f)) $o[] = 'polaroid/' . rawurlencode(basename($f));
        echo json_encode($o); exit;
    }
    if ($a === 'all') { echo json_encode(loadAll($p), JSON_UNESCAPED_UNICODE); exit; }

    if ($a === 'save') {
        $t = $b['_t'] ?? ''; $id = $b['id'] ?? ''; chk($id);
        switch ($t) {
            case 'task':
                $f = $b['file'] ?? null;
                upsert($p, 'tasks', ['id' => $id, 'judul' => $b['judul'] ?? '', 'mk' => $b['mk'] ?? '', 'pert' => ($b['pert'] ?? '') === '' ? null : (int)$b['pert'],
                    'deadline' => gmdate('Y-m-d H:i:s', strtotime($b['deadline'] ?? 'now')), 'note' => $b['note'] ?? '', 'link' => $b['link'] ?? '',
                    'done' => !empty($b['done']) ? 1 : 0, 'submitted' => !empty($b['submitted']) ? 1 : 0,
                    'file_name' => $f['name'] ?? null, 'file_type' => $f['type'] ?? null, 'file_size' => $f['size'] ?? null, 'file_url' => $f['url'] ?? null]);
                break;
            case 'class':
                upsert($p, 'classes', ['id' => $id, 'nama' => $b['nama'] ?? '', 'hari' => (int)($b['hari'] ?? 0), 'mulai' => $b['mulai'] ?? '08:00', 'selesai' => $b['selesai'] ?? '09:40',
                    'ruang' => $b['ruang'] ?? '', 'mode' => ($b['mode'] ?? '') === 'offline' ? 'offline' : 'online']);
                break;
            case 'meeting':
                upsert($p, 'meetings', ['id' => $id, 'class_id' => $b['classId'] ?? '', 'no' => (int)($b['no'] ?? 1), 'judul' => $b['judul'] ?? '',
                    'tgl' => !empty($b['tgl']) ? $b['tgl'] : null, 'zoom' => $b['zoom'] ?? '', 'link' => $b['link'] ?? '', 'note' => $b['note'] ?? '']);
                $keep = array_column($b['files'] ?? [], 'url');
                foreach (col($p, 'SELECT url FROM meeting_files WHERE meeting_id=?', [$id]) as $u) if (!in_array($u, $keep, true)) rmfile($u);
                $p->prepare('DELETE FROM meeting_files WHERE meeting_id=?')->execute([$id]);
                foreach (($b['files'] ?? []) as $f) upsert($p, 'meeting_files', ['id' => bin2hex(random_bytes(8)), 'meeting_id' => $id, 'name' => $f['name'] ?? '', 'type' => $f['type'] ?? '', 'size' => (int)($f['size'] ?? 0), 'url' => $f['url'] ?? '']);
                break;
            case 'override':
                upsert($p, 'class_overrides', ['id' => $id, 'class_id' => $b['classId'] ?? '', 'tgl' => $b['tgl'] ?? date('Y-m-d'), 'mode' => ($b['mode'] ?? '') === 'offline' ? 'offline' : 'online',
                    'ruang' => $b['ruang'] ?? '', 'mulai' => ($b['mulai'] ?? '') ?: null, 'selesai' => ($b['selesai'] ?? '') ?: null, 'batal' => !empty($b['batal']) ? 1 : 0, 'note' => $b['note'] ?? '']);
                break;
            case 'video': upsert($p, 'videos', ['id' => $id, 'url' => $b['url'] ?? '', 'embed' => $b['embed'] ?? '', 'judul' => $b['judul'] ?? '']); break;
            case 'card': upsert($p, 'cards', ['id' => $id, 'date' => $b['date'] ?? '', 'q' => $b['q'] ?? '', 't' => (int)($b['t'] ?? 0), 'ts' => (int)($b['ts'] ?? 0), 'img' => $b['img'] ?? '']); break;
            case 'profile':
                upsert($p, 'profile', ['id' => 1, 'nama' => $b['Nama'] ?? '', 'nim' => $b['Nim'] ?? '', 'kampus' => $b['Kampus'] ?? '', 'ig' => $b['Ig'] ?? '', 'gh' => $b['Gh'] ?? '', 'email' => $b['Email'] ?? '', 'bio' => $b['Bio'] ?? '', 'foto' => $b['foto'] ?? '']);
                break;
            case 'settings':
                $d = $b['dur'] ?? []; $pm = $b['pomo'] ?? [];
                upsert($p, 'settings', ['id' => 1, 'goal' => max(1, (int)($b['goal'] ?? 4)), 'dur_f' => max(1, (int)($d['f'] ?? 25)), 'dur_s' => max(1, (int)($d['s'] ?? 5)), 'dur_l' => max(1, (int)($d['l'] ?? 15)),
                    'pomo_date' => ($pm['date'] ?? '') ?: null, 'pomo_count' => (int)($pm['count'] ?? 0), 'pending' => !empty($b['pending']) ? 1 : 0, 'last_yt' => ($b['lastYt'] ?? '') ?: null]);
                break;
            default: fail('Tipe tidak dikenal', 400);
        }
        echo json_encode(['ok' => true]); exit;
    }

    if ($a === 'delete') {
        $id = $b['id'] ?? ''; chk($id);
        $map = ['task' => 'tasks', 'class' => 'classes', 'meeting' => 'meetings', 'override' => 'class_overrides', 'video' => 'videos', 'card' => 'cards'];
        $pre = explode('_', $id)[0];
        if (!isset($map[$pre])) fail('Tipe tidak dikenal', 400);
        if ($pre === 'task') foreach (col($p, 'SELECT file_url FROM tasks WHERE id=?', [$id]) as $u) rmfile($u);
        if ($pre === 'meeting') foreach (col($p, 'SELECT url FROM meeting_files WHERE meeting_id=?', [$id]) as $u) rmfile($u);
        if ($pre === 'class') foreach (col($p, 'SELECT f.url FROM meeting_files f JOIN meetings m ON m.id=f.meeting_id WHERE m.class_id=?', [$id]) as $u) rmfile($u);
        $p->prepare("DELETE FROM `{$map[$pre]}` WHERE id=?")->execute([$id]);
        echo json_encode(['ok' => true]); exit;
    }

    if ($a === 'upload') {
        if (empty($_FILES['file'])) fail('Tidak ada file diterima. Naikkan upload_max_filesize dan post_max_size di php.ini', 400);
        $f = $_FILES['file'];
        if ($f['error'] !== UPLOAD_ERR_OK) fail('Upload gagal (kode ' . $f['error'] . '). Naikkan upload_max_filesize dan post_max_size di php.ini', 400);
        if ($f['size'] > 100 * 1048576) fail('Maksimal 100 MB', 400);
        $name = basename($f['name']);
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (in_array($ext, ['php', 'phtml', 'phar', 'php5', 'php7', 'exe', 'bat', 'cmd', 'sh', 'js', 'html', 'htm', 'svg'], true)) fail('Tipe file ini tidak diizinkan', 400);
        $safe = substr(preg_replace('/[^A-Za-z0-9._-]+/', '_', pathinfo($name, PATHINFO_FILENAME)), 0, 60);
        $fn = bin2hex(random_bytes(6)) . '_' . $safe . ($ext ? '.' . $ext : '');
        $dest = __DIR__ . '/uploads/' . $fn;
        if (!move_uploaded_file($f['tmp_name'], $dest)) fail('Gagal menyimpan file ke folder uploads', 500);
        $type = function_exists('mime_content_type') ? (mime_content_type($dest) ?: $f['type']) : $f['type'];
        echo json_encode(['name' => $name, 'type' => $type ?: 'application/octet-stream', 'size' => (int)$f['size'], 'url' => 'uploads/' . $fn], JSON_UNESCAPED_UNICODE); exit;
    }
    fail('Aksi tidak dikenal', 400);
} catch (Throwable $e) {
    fail($e->getMessage());
}
