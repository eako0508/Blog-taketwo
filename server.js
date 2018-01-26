const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

mongoose.Promise = global.Promise;

const { PORT, DATABASE_URL } = require('./config');
const { BlogPosts } = require('./models');

const app = express();
app.use(morgan('common'));
app.use(bodyParser.json());

app.get('/posts', (req,res) =>{
  BlogPosts
    .find()
    .limit(10)
    .then(blogs => {
		res.json({
			post: blogs.map(
				(blogs) => blogs.serialize())
		});
	})
    .catch(err=>{
      console.error(err);
      res.status(500).json({ message: 'Internal server error'});
    });
});

app.get('/posts/:id', (req,res)=>{
  BlogPosts
    .findById(req.params.id)
	.then(blogs => res.json(blogs.serialize()))
    .catch(err=>{
      console.error(err);
      res.status(500).json({ message: 'Internal server error'});
    });
});

app.put('/posts/:id', (req,res)=>{
  if(!(req.params.id && req.body.id && req.params.id === req.body.id)){
    const message = (
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`);
    console.error(message);
    return res.status(400).json({message: message}); 
  }
  
  const updatedEntry = {};
  const updateFields = ['title', 'content', 'author'];
  updateFields.forEach(field =>{
    if(field in req.body){
      updatedEntry[field] = req.body[field];
    }
  });
  BlogPosts
    .findByIdAndUpdate(req.params.id, {$set: updatedEntry},{new:true})
	.then(blog=>res.status(200).json(blog.serialize()))
	.catch(err=>res.status(500).json({message: 'Internal serve error'}));
});

app.post('/posts', (req,res)=>{
  const requiredFields = ['title', 'content', 'author'];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
	/*
	if (field == 'author'){
    const requiredName = ['firstName', 'lastName'];
		for(let j=0;j<requiredName.length;j++){
			const fieldName = requiredName[j];
			console.log(fieldName);
			if( !(fieldName in req.body) ){
				const message = `Missing \`${fieldName}\` in request body`;
				console.error(message);
				return res.status(400).send(message);
			}
		}
	}
	*/
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }
  BlogPosts
    .create({
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
      publishDate: Date.now()
    })
    .then(blog => res.status(201).json(blog.serialize()))
    .catch(err=>{
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.delete('/posts/:id', (req,res)=>{
  BlogPosts
    .findByIdAndRemove(req.params.id)
    .then(blog => res.status(204).end())
    .catch(err =>{
      res.status(500).json({message: 'Internal server error'});
    });
});

let server;

function runServer(databaseUrl = DATABASE_URL, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, {useMongoClient: true}, err =>{
      if(err){
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      }).on('error', err => {
        mongoose.disconnect();
        reject(err)
      });  
    });
  });
}

function closeServer() {
  return mongoose.disconnect().then(()=>{
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer().catch(err => console.error(err));
};

module.exports = {app, runServer, closeServer};
