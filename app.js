const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'online_shop'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// File Upload Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) throw err;
        res.render('index', { products: results });
    });
});

app.get('/add', (req, res) => {
    res.render('add-product');
});

app.post('/add', upload.single('image'), (req, res) => {
    const { name, description, price } = req.body;
    const image_url = '/uploads/' + req.file.filename;
    const newProduct = { name, description, price, image_url };

    db.query('INSERT INTO products SET ?', newProduct, (err, result) => {
        if (err) throw err;
        console.log('Product added to database');
        res.redirect('/');
    });
});

app.get('/edit/:id', (req, res) => {
    const productId = req.params.id;
    db.query('SELECT * FROM products WHERE id = ?', productId, (err, result) => {
        if (err) throw err;
        res.render('edit-product', { product: result[0] });
    });
});

app.post('/edit/:id', upload.single('image'), (req, res) => {
    const productId = req.params.id;
    const { name, description, price } = req.body;
    let updatedProduct = { name, description, price };
    if (req.file) {
        const image_url = '/uploads/' + req.file.filename;
        updatedProduct.image_url = image_url;
    }

    db.query('UPDATE products SET ? WHERE id = ?', [updatedProduct, productId], (err, result) => {
        if (err) throw err;
        console.log('Product updated');
        res.redirect('/');
    });
});

app.post('/delete/:id', (req, res) => {
    const productId = req.params.id;
    db.query('DELETE FROM products WHERE id = ?', productId, (err, result) => {
        if (err) throw err;
        console.log('Product deleted');
        res.redirect('/');
    });
});

app.post('/mark-sold/:id', (req, res) => {
    const productId = req.params.id;
    db.query('UPDATE products SET sold = true WHERE id = ?', productId, (err, result) => {
        if (err) throw err;
        console.log('Product marked as sold');
        res.redirect('/');
    });
});

// Cart Routes
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
        return res.render('cart', { cart: [] });
    }

    db.query('SELECT * FROM products WHERE id IN (?)', [cart], (err, results) => {
        if (err) throw err;
        res.render('cart', { cart: results });
    });
});

app.post('/cart/add/:id', (req, res) => {
    const productId = req.params.id;
    const cart = req.session.cart || [];
    if (!cart.includes(productId)) {
        cart.push(productId);
    }
    req.session.cart = cart;
    res.redirect('/');
});

app.post('/cart/remove/:id', (req, res) => {
    const productId = req.params.id;
    req.session.cart = (req.session.cart || []).filter(id => id !== productId);
    res.redirect('/cart');
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});