const addToCart = (button)=>{
    const productId = button.parentNode.querySelector("[name=productId]").value
    const csrf = button.parentNode.querySelector("[name=_csrf]").value

    fetch(`/add-to-cart/${productId}`, {
        method: "POST",
        headers: {
            "csrf-token": csrf
        }
    }).then(result =>{
        return result.json()
    }).catch(err => console.log(err))
}