// Se importa el archivo user con el esquema y los datos
const User=require("../models/User")
const jwt=require("jsonwebtoken")
const Productos=require("../models/Productos")
const bcrypt = require("bcrypt")
const passport = require("passport")

let username = null
let msj_login = false
let incomplete = false
let arraycarrito=[]

// Manejo de errores
const handleErrors=(err)=>{
    // se imprime el mensaje de error y el código del error en la consola.
    console.log(err.message,err.code)
    // se inicializa un objeto llamado "error" con propiedades para diferentes campos. Esto se utilizará para almacenar mensajes de error específicos para cada campo.
    let error = {email:"",name:"",user:"",password:"",phone:"",region:""}

    // Duplicaion de email
    if (err.code === 11000) {
        // Si el error tiene el código 11000, se asume que es un error de duplicación de un valor único en la base de datos, como un email duplicado. En este caso, se establece el mensaje de error correspondiente en la propiedad "email" del objeto "error"

        if (err.message.includes("email")) {
            error.email = "Este email ya está en uso";
        }
        if (err.message.includes("user")) {
            error.user = "Este usuario ya está en uso";
        }
        return error;
}

    // Validacion de errores
    if(err.message.includes("Usuarios validation failed")){
        // Si el error es una validación de errores generados por el modelo de usuario ("Usuarios validation failed"), se procesan estos errores y se almacenan los mensajes de error específicos para cada campo en el objeto "error".
        object.values(err.errors).forEach(({properties})=>{
            error[properties.path]=properties.message
        })
    }
    return error
}

// Token
const maxAge=3*24*60*60
const createToken=(id)=>{
    //se retorna el jwt con el metodo sign que seria para crear el token a traves del parametro id y con "secret" que es una cadena de texto secreta para terminar de concretar el token
    return jwt.sign({id},"secret",{
        expiresIn:maxAge
    })
}

module.exports.middleware = {
    middle: (req,res,next)=>{
        if(req.isAuthenticated()){
            next();
        }else{
            res.redirect("signin")
        }
    },
    arrayCartPromise: async (req,res,next) =>{ 
        if(req.user){
            username=req.user.name
            items=req.user.cart.items
            if(items.length>arraycarrito.length){
                let promesa =  items.map(async(elemento)=> {
                let producto = await Productos.findById(elemento.productId)
                return producto
            });
            arraycarrito = await Promise.all(promesa); 
            }
        }
        console.log("productos a renderizar", arraycarrito)
        next()
    }
}

// se exporta la logica de las rutas a authRoutes

// SignUp, LogIn y LogOut

module.exports.signup_post= async(req,res)=>{
    // Destructuring
    const {email,name,user,password,phone,region}=req.body
    // Se usa un TRY y un CATCH para el manejo de errores
    try{
        const users= await User.create({email,name,user,password,phone,region})
        // Encriptar datos como token
        const token=createToken(users._id,users.email,users.password)
        res.cookie("jwt",token,{httpOnly:true,maxAge:maxAge*1000})
        res.status(201).json(users)
        username = user
    }
    catch(err){
        const errors=handleErrors(err)
        res.status(400).json({errors})
    }
}

module.exports.signup_get=(req,res)=>{
    res.render("signup")
    
}

module.exports.login_post=async(req,res)=>{
    if(req.isAuthenticated()){
        username=req.user.name
        msj_login=false
        res.redirect("home")
    }else{
        msj_login=true
    }
}

module.exports.login_get=(req,res)=>{
    let errorText = "Hubo un error en su petición. Por favor, intente más tarde"
    res.render("signin",{username, msj_login, errorText})
}

module.exports.signOut_get=(req,res)=>{
    let username = null
    res.render("signout",{username})
}

//agrego la funcion para la page ofertas
module.exports.ofertas_get= async (req,res)=>{
   let page = req.query.page
   if (page == null){page = 1}

   const productosrender= await Productos.paginate({},{limit:12,page:page})

  ////funcion que estoy probando
  let a = 5
  let llave = req.query.llave
  page = productosrender.page
 
   if(page==1){
      llave=false
  }else if(llave){   
       a=page+4
    }
   await res.render("ofertas",{username, productosrender,a, arraycarrito})
}

//agrego la funcion para la page product
module.exports.product_get= async (req,res)=>{
    const paramid = req.query.id
    const paramcolec = req.query.coleccion

    const productrender= await Productos.find({_id:paramid})// producto en particular(en el que se hizo click)
  

     //paginacion (primera parte)
    let idproduct = productrender[0]._id //variable para seguir viendo el producto seleccionado atraves de las paginas
    let coleccionproduct = productrender[0].coleccion// variable para recorrer paginas de productos similares
   let page = req.query.page
   if (page == null){page = 1}

   // llamdos a db
    const productsimilares= await Productos.paginate({coleccion:paramcolec},{limit:12,page:page})

    ////paginacion (segundaparte)
  let a = 5 //catidad de botones visibles
  let llave = req.query.llave
  page = productsimilares.page
 
   if(page==1){
      llave=false
  }else if(llave){   
       a=page+4
    }
 
    res.render("product",{productrender, productsimilares, a, idproduct, coleccionproduct})
 }


//agrego la funcion para la page home
module.exports.home_get=async(req,res)=>{
    //Buscador
    //declaro variable
    const palabraclave = req.query.palabraclave //aca tengo una duda tuve que usar req.query y nose porque sera por es get
    const expresionregular = new RegExp(palabraclave, 'i');//se crea a expresion relugular apartir de la variable palabraclave, la "i" es para que sea insensible a las mayusculas
    let productosrender = llamado(expresionregular);// funcion de llamado a DB con la logica del buscador incluida


    // llamado a db para ofertas
    const homeofertas= await Productos.find({coleccion:"ofertas"})
    let i = 2;
    let j = 5;

//    //llamado para carrito
//    const arraycarrito=await Productos.find({})
      //paginacion (primera parte)
      let page = req.query.page
      if (page == null){page = 1}
   
      // llamdos a db
      async function llamado (expresionregular,page){
        if(palabraclave == ""){
          productosrender= await Productos.paginate({},{limit:12,page:page})
  
        }else{
          productosrender= await Productos.paginate({nombre:{ $regex: expresionregular }},{limit:12,page:page})
        }
        return productosrender
      }
   
     ////paginacion (segundaparte)
     let a = 5 //catidad de botones visibles
     let llave = req.query.llave
     page = productosrender.page
    
      if(page==1){
         llave=false
     }else if(llave){   
          a=page+4
       }
    res.render("home",{username, homeofertas,i,j,arraycarrito,productosrender,a})
}

module.exports.agregarAlCarrito=async(req,res)=>{
    try{
        if(!req.isAuthenticated()){
            res.redirect("signin")
        }
        if(req.isAuthenticated()) {
            console.log(req.user.id)
            await User.findById(req.user.id) //busca id del usuario
            const producto= await Productos.findById(req.body.id) //busca el id del producto en la base
            const result= await req.user.agregarAlCarrito(producto) //agrega al carrit
            if(result){
                res.redirect("/home")
            }
        }
    }
    catch(err){ console.log (err) }
}

//agrego la funcion para la page de contacto
module.exports.contacto_get= async(req,res)=>{
    res.render("contacto",{username, arraycarrito})
  }
  
  //agrego la funcion para la page de miscompras
module.exports.miscompras_get= async(req,res)=>{
    res.render("miscompras",{username, arraycarrito})
  }

module.exports.miperfil_get= (req,res)=>{
    nombre=req.user.name
    username=req.user.user
    telefono = req.user.phone
    res.render("miperfil",{username, arraycarrito, incomplete})
}

module.exports.editarMiPerfil = async (req,res)=>{
    console.log(req.body)
    console.log(req.user.id)
    try{
        const {name,user,phone} = req.body
        const usuario = req.user.id
        if(name == "" || user == "" || phone == ""){
            incomplete = true
            res.redirect("miperfil")
        }else{
            incomplete = false
            await User.findByIdAndUpdate({_id:usuario},{name:name,user:user,phone:phone})
            res.redirect("miperfil")
        }
    }
    catch(err){ console.log (err) }
}

module.exports.informacion_get = (req, res)=>{
    res.render("informacion",{username, arraycarrito})
}